# DevBox ZeroOps — Agent Skills Collection (`SKILL.md`)

[![skills.sh](https://skills.sh/b/devbox-zero-ops/agent-skills)](https://skills.sh/devbox-zero-ops/agent-skills)

Five production-tested, **zero-dependency** Agent Skills built for **Claude Code, Codex CLI, Cursor, Gemini CLI, and OpenClaw** — install every skill directly via [`skills.sh`](https://skills.sh) or browse our [Agensi.io Creator Profile](https://www.agensi.io/creators/devbox-zeroops).

```bash
npx skills add devbox-zero-ops/agent-skills
```

## Included Skills (0 External Dependencies · 0 API Keys Required)

| Skill | Runtime | Category | What It Does |
|---|---|---|---|
| [`quant-radar`](skills/quant-radar/SKILL.md) | Python 3.8+ (stdlib) | Trading & Investing | Cross-exchange perp funding arbitrage (Hyperliquid / Binance / Bybit), Polymarket NegRisk mispricing radar, rollover-safe paper trading & Telegram/Webhook alerts |
| [`wallet-watch`](skills/wallet-watch/SKILL.md) | Node.js 18+ (built-in `fetch`) | Web3 & Crypto | Multi-chain EVM (BSC BEP-20, Ethereum, Arbitrum, Polygon, Base, Optimism) & Solana SPL USDT/USDC/gas balance monitor + threshold/delta webhooks |
| [`primary-source-research`](skills/primary-source-research/SKILL.md) | Python 3.8+ (stdlib) | Research & Analysis | Direct zero-API-key queries across 22 official primary sources (FRED, US Treasury, ECB FX, World Bank, SEC EDGAR, OpenFDA, NIH ClinicalTrials, USGS, arXiv, GitHub/PyPI/npm, DefiLlama, etc.) |
| [`llm-cost-optimizer`](skills/llm-cost-optimizer/SKILL.md) | Python 3.8+ (stdlib, 100% offline) | LLM Ops | 14-model LLM API cost estimator with prompt caching math, local prompt bloat auditor (`UNMINIFIED_JSON`, duplicate lines), and subscription break-even calculator |
| [`changeproof-auditor`](skills/changeproof-auditor/SKILL.md) | Node.js 18+ (`node:crypto`, 100% offline) | Compliance & DevOps | Regulated change-control engine for FDA 21 CFR Part 11, ISO 13485 & AS9100D: FMEA RPN scoring, proposer/QA separation-of-duties guard, SHA-256 tamper-evident ledger & inspector-ready dossiers |

## Live Marketplace Listings (Agensi.io)

- **Creator Profile:** https://www.agensi.io/creators/devbox-zeroops
- **Quant Radar:** https://www.agensi.io/skills/quant-radar-perp-funding-polymarket-arbitrage
- **WalletWatch:** https://www.agensi.io/skills/walletwatch-multi-chain-usdt-usdc-sol-monitor
- **Primary Source Research:** https://www.agensi.io/skills/primary-source-research-22-zero-key-official-apis
- **LLM Cost Optimizer:** https://www.agensi.io/skills/llm-cost-optimizer-prompt-cache-plan-break-even
- **ChangeProof Compliance Auditor:** https://www.agensi.io/skills/changeproof-compliance-auditor-fda-iso-13485-as9100d

## Companion Tools & White-Label Pro Source Bundle

- **Free Zero-Tracking Browser Tools Hub:** https://devbox-zero-ops.github.io/xiaheai-hub/
- **Interactive LLM Cost Calculator (`TokenCost Zero`):** https://devbox-zero-ops.github.io/tokencost-zero/
- **Full 8-Tool White-Label Source Bundle (MIT / Commercial):** https://devbox-zero-ops.github.io/xiaheai-hub/pro.html
- **Atlassian Forge + Rovo MCP App (`ChangeProof MCP`):** https://github.com/devbox-zero-ops/changeproof-mcp

- **Engineering Walkthrough (Dev.to):** https://dev.to/devboxzeroops/5-zero-dependency-agent-skills-built-on-python-stdlib-nodejs-built-ins-v110-3ep0

## License

MIT — see [LICENSE](LICENSE).
