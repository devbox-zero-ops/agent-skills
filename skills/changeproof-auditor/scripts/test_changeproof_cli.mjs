import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cliPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'changeproof_cli.mjs');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: 'utf8' });
}

test('CLI rpn, signoff SoD rejection, valid chain, tamper detection, and audit packet', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-skill-'));
  const ledger = path.join(tmp, 'ledger.json');
  const reqFile = path.join(tmp, 'req.json');
  fs.writeFileSync(reqFile, JSON.stringify({
    issue: {
      key: 'QMS-42',
      summary: 'Update calibration per SOP-QA-104',
      description: 'Severity: 8, Occurrence: 4, Detectability: 3. Rollback plan & CAPA-2026-014 verified.',
      reporterAccountId: 'acct-eng-01',
    },
    confluencePages: [{ id: '1', title: 'SOP-QA-104 Calibration', version: 4, lastUpdated: '2024-01-01T00:00:00Z' }],
  }));

  const r1 = runCli(['rpn', '--standard', 'FDA_21CFR11', '--severity', '8', '--occurrence', '4', '--detectability', '3']);
  assert.equal(r1.status, 0);
  assert.equal(JSON.parse(r1.stdout).rpn, 96);

  // Self-approval MUST fail with exit code 2
  const rSelf = runCli([
    'signoff', '--ledger', ledger, '--issue', 'QMS-42',
    '--actor', 'acct-eng-01', '--proposer', 'acct-eng-01',
    '--role', 'QA_APPROVER', '--rpn', '96', '--rationale', 'Self approval attempt',
  ]);
  assert.equal(rSelf.status, 2);

  // Valid independent QA signoff succeeds
  const rQa = runCli([
    'signoff', '--ledger', ledger, '--issue', 'QMS-42',
    '--actor', 'acct-qa-09', '--proposer', 'acct-eng-01',
    '--role', 'QA_APPROVER', '--rpn', '96', '--rationale', 'Independent QA verified IQ/OQ.',
  ]);
  assert.equal(rQa.status, 0);

  // Verify valid chain -> exit 0
  const rVer = runCli(['verify-chain', '--ledger', ledger]);
  assert.equal(rVer.status, 0);
  assert.equal(JSON.parse(rVer.stdout).status, 'VERIFIED');

  // Packet markdown export works
  const rPkt = runCli(['packet', '--input', reqFile, '--ledger', ledger, '--format', 'markdown']);
  assert.equal(rPkt.status, 0);
  assert.ok(rPkt.stdout.includes('QMS-42'));
  assert.ok(rPkt.stdout.includes('SOP-QA-104'));

  // Tamper 1 byte -> verify-chain MUST exit 3 TAMPERED
  const raw = JSON.parse(fs.readFileSync(ledger, 'utf8'));
  raw[0].rationale += '!';
  fs.writeFileSync(ledger, JSON.stringify(raw));
  const rTamper = runCli(['verify-chain', '--ledger', ledger]);
  assert.equal(rTamper.status, 3);
  assert.equal(JSON.parse(rTamper.stdout).status, 'TAMPERED');

  fs.rmSync(tmp, { recursive: true, force: true });
});
