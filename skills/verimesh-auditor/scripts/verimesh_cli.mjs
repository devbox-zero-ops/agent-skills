#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { auditAgenticSite } from './conformance_engine.mjs';

function parseArgs(argv) {
  const cmd = argv[0] || 'help';
  const flags = {};
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { flags[k] = next; i++; }
      else flags[k] = true;
    }
  }
  return { cmd, flags };
}

async function fetchJson(u) {
  const r = await fetch(u, { headers: { 'User-Agent': 'verimesh-auditor/1.0' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${u}`);
  return r.json();
}

function readJsonOpt(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function toMarkdown(rep) {
  const lines = [
    `## Open Agentic Web Audit: ${rep.baseUrl}`,
    `**Score:** ${rep.score}/100 (${rep.grade}) · **Passed:** ${rep.passedCount}/${rep.totalChecks}`,
    '',
    '| Gate | Result | Weight | Detail |',
    '| --- | --- | ---: | --- |',
  ];
  for (const c of rep.checks) {
    lines.push(`| ${c.label} | ${c.passed ? 'PASS' : 'FAIL'} | ${c.weight} | ${c.detail} |`);
  }
  return lines.join('\n');
}

const { cmd, flags } = parseArgs(process.argv.slice(2));
const minScore = Number(flags['min-score'] || 0);

if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
  console.log(JSON.stringify({ tool: 'verimesh-auditor', commands: ['audit-url', 'audit-dir'] }, null, 2));
  process.exit(0);
}

if (cmd === 'audit-url') {
  if (!flags.url) { console.error('Required: --url <https://...>'); process.exit(1); }
  const base = flags.url.endsWith('/') ? flags.url : `${flags.url}/`;
  const manifest = await fetchJson(new URL('agent-manifest.json', base).href);
  const firstNet = Array.isArray(manifest.networks) ? manifest.networks[0] : null;
  const network = firstNet?.hocon ? await fetchJson(new URL(firstNet.hocon, base).href) : null;
  let nsdeploy = null;
  try { nsdeploy = await fetchJson(new URL('.well-known/nsdeploy.json', base).href); } catch {}
  const rep = auditAgenticSite({ baseUrl: base, manifest, network, nsdeploy });
  console.log(flags.format === 'md' ? toMarkdown(rep) : JSON.stringify(rep, null, 2));
  process.exit(rep.score >= minScore ? 0 : 2);
}

if (cmd === 'audit-dir') {
  if (!flags.dir) { console.error('Required: --dir <path>'); process.exit(1); }
  const dir = path.resolve(flags.dir);
  const manifest = readJsonOpt(path.join(dir, 'agent-manifest.json'));
  const firstNet = Array.isArray(manifest?.networks) ? manifest.networks[0] : null;
  const network = firstNet?.hocon ? readJsonOpt(path.resolve(dir, firstNet.hocon)) : null;
  const nsdeploy = readJsonOpt(path.join(dir, '.well-known', 'nsdeploy.json'));
  const rep = auditAgenticSite({ baseUrl: dir, manifest, network, nsdeploy });
  console.log(flags.format === 'md' ? toMarkdown(rep) : JSON.stringify(rep, null, 2));
  process.exit(rep.score >= minScore ? 0 : 2);
}

console.error(`Unknown command: ${cmd}`);
process.exit(1);
