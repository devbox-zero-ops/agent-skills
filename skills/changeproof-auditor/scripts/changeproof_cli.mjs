#!/usr/bin/env node
import fs from 'node:fs';
import {
  appendAuditEntry,
  assessChangeControl,
  calculateRpn,
  generateAuditPacket,
  getStandardProfile,
  verifyAuditChain,
  verifySeparationOfDuties,
} from './compliance_engine.mjs';

function parseArgs(argv) {
  const cmd = argv[0] || 'help';
  const flags = {};
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[k] = next;
        i++;
      } else {
        flags[k] = true;
      }
    }
  }
  return { cmd, flags };
}

function readJsonFile(p, fallback) {
  if (!p || !fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const { cmd, flags } = parseArgs(process.argv.slice(2));

if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
  console.log(JSON.stringify({
    tool: 'changeproof-auditor',
    commands: ['rpn', 'assess', 'signoff', 'verify-chain', 'packet'],
    standards: ['FDA_21CFR11', 'ISO_13485', 'AS9100D'],
  }, null, 2));
  process.exit(0);
}

if (cmd === 'rpn') {
  const out = calculateRpn({
    severity: Number(flags.severity),
    occurrence: Number(flags.occurrence),
    detectability: Number(flags.detectability),
    standardCode: flags.standard || 'FDA_21CFR11',
  });
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

if (cmd === 'assess') {
  const input = readJsonFile(flags.input, {});
  const ledger = readJsonFile(flags.ledger, []);
  const res = assessChangeControl({
    issue: input.issue || input,
    standardCode: flags.standard || input.standardCode || 'FDA_21CFR11',
    fmea: input.fmea || {},
    confluencePages: input.confluencePages || [],
    graphLinks: input.graphLinks || [],
    auditEntries: Array.isArray(ledger) ? ledger : [],
    capaRecords: input.capaRecords || [],
  });
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}

if (cmd === 'signoff') {
  const ledgerPath = flags.ledger;
  if (!ledgerPath || !flags.issue || !flags.actor || !flags.role || !flags.rationale) {
    console.error('Required: --ledger --issue --actor --role --rationale');
    process.exit(1);
  }
  const existing = readJsonFile(ledgerPath, []);
  const pre = verifyAuditChain(existing);
  if (!pre.valid) {
    console.error(JSON.stringify({ ok: false, error: 'Existing ledger tampered', verification: pre }));
    process.exit(3);
  }
  const role = String(flags.role).toUpperCase();
  const standardCode = getStandardProfile(flags.standard || 'FDA_21CFR11').code;
  const sod = verifySeparationOfDuties({
    proposerAccountId: flags.proposer || (role === 'PROPOSER' ? flags.actor : null),
    qaApproverAccountId: role === 'QA_APPROVER' ? flags.actor : flags['qa-approver'] || null,
    releaseAuthorityAccountId: role === 'RELEASE_AUTHORITY' ? flags.actor : flags['release-authority'] || null,
    rpn: Number(flags.rpn || 0),
    standardCode,
  });
  const conflicts = (sod.violations || []).filter((v) => /CONFLICT|SELF/i.test(String(v.code || '')));
  if (conflicts.length > 0) {
    console.error(JSON.stringify({ ok: false, rejectedBySeparationOfDuties: true, violations: conflicts }, null, 2));
    process.exit(2);
  }
  const action =
    role === 'QA_APPROVER' ? 'APPROVE_QA' : role === 'RELEASE_AUTHORITY' ? 'APPROVE_RELEASE' : 'PROPOSE_CHANGE';
  const { entry, entries } = appendAuditEntry(existing, {
    issueKey: flags.issue,
    actorAccountId: flags.actor,
    role,
    action,
    standard: standardCode,
    rationale: flags.rationale,
  });
  fs.writeFileSync(ledgerPath, JSON.stringify(entries, null, 2), 'utf8');
  console.log(JSON.stringify({ ok: true, seq: entry.seq, entryHash: entry.entryHash, sodCompliant: sod.compliant }, null, 2));
  process.exit(0);
}

if (cmd === 'verify-chain') {
  const entries = readJsonFile(flags.ledger, []);
  const res = verifyAuditChain(entries);
  console.log(JSON.stringify(res, null, 2));
  process.exit(res.valid ? 0 : 3);
}

if (cmd === 'packet') {
  const input = readJsonFile(flags.input, {});
  const ledger = readJsonFile(flags.ledger, []);
  const assessment = assessChangeControl({
    issue: input.issue || input,
    standardCode: flags.standard || input.standardCode || 'FDA_21CFR11',
    fmea: input.fmea || {},
    confluencePages: input.confluencePages || [],
    graphLinks: input.graphLinks || [],
    auditEntries: Array.isArray(ledger) ? ledger : [],
    capaRecords: input.capaRecords || [],
  });
  const pkt = generateAuditPacket({
    assessment,
    auditEntries: Array.isArray(ledger) ? ledger : [],
    capaRecords: input.capaRecords || [],
    generatedBy: flags.actor || 'cli-auditor',
  });
  if (flags.format === 'markdown') {
    console.log(pkt.markdown);
  } else {
    console.log(JSON.stringify({ packetId: pkt.packetId, packetDigest: pkt.packetDigest, dossier: pkt.dossier }, null, 2));
  }
  process.exit(0);
}

console.error(`Unknown command: ${cmd}`);
process.exit(1);
