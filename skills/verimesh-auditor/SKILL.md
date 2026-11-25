---
name: verimesh-auditor
description: Audit any Open Agentic Website against the Worldwide Agentic Web Minimum Viable Specification (MVP Profile 0.3) using zero-dependency Node.js 18+ built-ins. Validates agent-manifest.json, resolved Neuro SAN .network.json graphs, front-agent reachability, peer_policy trust boundaries, secret hygiene, and .well-known/nsdeploy.json discovery endpoints.
---

# VeriMesh Open Agentic Web Auditor

Zero-dependency Node.js (`>=18`, built-in `fetch` and `node:fs` only) CLI skill for inspecting and scoring Open Agentic Websites against **Worldwide Agentic Web MVP Profile 0.3** (0–100 score, A+ to F grade, deterministic JSON or Markdown output).

## Commands

### 1. Audit a Live Open Agentic Website URL
```bash
node scripts/verimesh_cli.mjs audit-url --url https://devbox-zero-ops.github.io/verimesh-agentic-web/ --format md
```

### 2. Audit a Local Agentic Website Directory (CI Gate)
```bash
node scripts/verimesh_cli.mjs audit-dir --dir ./dist --min-score 90
```
Exits `0` when `score >= --min-score`, or exit code `2` when below threshold.

## Checked Conformance Controls (9 Weighted Gates)
1. Valid `agent-manifest.json` with `brand` and `networks[]` (+15)
2. Primary network identity (`name`, `front_man`, `hocon` path) (+10)
3. Resolved data-only Neuro SAN `.network.json` with `tools[]` (+15)
4. Reachable `front_man` agent with `function.description` and `instructions` (+15)
5. Zero dangling internal sub-agent references (+10)
6. Pluggable `llm_router` / BYOK inference endpoint declaration (+10)
7. Explicit `peer_policy` trust boundary (`closed` / `allowlist`) (+10)
8. Zero leaked API keys / credentials in public JSON (+10)
9. `.well-known/nsdeploy.json` (`nsdeploy-link/v1`) discovery metadata (+5)

See `references/mvp-profile-0.3.md` for schema examples and remediation tips.
