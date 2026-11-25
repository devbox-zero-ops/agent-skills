---
name: changeproof-auditor
description: Run zero-dependency regulated change-control audits for FDA 21 CFR Part 11, ISO 13485, and AS9100D. Computes FMEA Risk Priority Numbers (RPN), enforces proposer/QA/release separation-of-duties, builds and verifies SHA-256 tamper-evident audit chains, traces controlled SOP blast radius, and exports inspector-ready Markdown/JSON audit dossiers using only Node.js built-ins.
---

# ChangeProof Compliance Auditor

A standalone, zero-dependency CLI skill for engineering, biotech, medical device, and aerospace quality workflows. Runs strictly on Node.js (`>=18`, `node:crypto` only) with zero external packages and zero API keys.

## Commands

### 1. Compute FMEA Risk Priority Number (RPN)
```bash
node scripts/changeproof_cli.mjs rpn --standard FDA_21CFR11 --severity 8 --occurrence 4 --detectability 3
```

### 2. Evaluate Full Change-Control Readiness (0–100)
```bash
node scripts/changeproof_cli.mjs assess --input ./change_request.json --standard ISO_13485
```

### 3. Append a SHA-256 Hash-Chained Sign-Off (With Separation-of-Duties Guard)
```bash
node scripts/changeproof_cli.mjs signoff --ledger ./ledger.json --issue QMS-42 --actor acct-qa-09 --role QA_APPROVER --proposer acct-eng-01 --standard FDA_21CFR11 --rpn 96 --rationale "Verified IQ/OQ calibration evidence and SOP-QA-104 redline."
```
Self-approval (`--actor` matching `--proposer`) is deterministically rejected with exit code `2`.

### 4. Verify Cryptographic Audit Chain Integrity
```bash
node scripts/changeproof_cli.mjs verify-chain --ledger ./ledger.json
```
Recomputes every `payloadHash` and `entryHash` from Genesis (`0x00...00`). Returns exit code `0` (`VERIFIED`) or exit code `3` (`TAMPERED`) if a single byte was altered, reordered, or deleted.

### 5. Export Inspector-Ready Audit Dossier (Markdown + JSON)
```bash
node scripts/changeproof_cli.mjs packet --input ./change_request.json --ledger ./ledger.json --standard AS9100D --format markdown
```

## Supported Regulatory Profiles
- `FDA_21CFR11` — Biotech, Pharmaceutical & Clinical Electronic Records
- `ISO_13485` — Medical Devices Quality Management Systems
- `AS9100D` — Aerospace & Precision Manufacturing Change Control

See `references/standards.md` for gate weights, RPN escalation thresholds, and sample JSON input schema.
