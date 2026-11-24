---
name: wallet-watch
description: >-
  Zero-dependency Node.js CLI for read-only multi-chain EVM (Base, Ethereum,
  Arbitrum, Optimism, Polygon, BSC) and Solana USDT, USDC, ETH, POL, BNB, and
  SOL balance tracking via raw JSON-RPC queries with no SDK bloat, structured
  JSON snapshots, and threshold or balance-change webhook alerts.
---

# wallet-watch

Track multi-chain stablecoin (`USDC`, `USDT`) and native gas (`ETH`, `POL`, `BNB`, `SOL`) balances across 6 EVM chains and Solana from a single zero-dependency ES module (`scripts/wallet-watch.mjs`).

- **Runtime:** Node.js 18+ built-in `fetch` and `node:url` only (`npm install` not required, zero SDK bloat).
- **Auth:** No API keys required on public RPCs; optional custom endpoints via `--rpc` or `WALLET_WATCH_RPC_<CHAIN>`.
- **Security default:** Strictly read-only public-address queries (`eth_getBalance`, `eth_call`, `getBalance`, `getTokenAccountsByOwner`). Never accepts private keys, mnemonics, or signing operations.

## When to Use

- Checking live **USDT**, **USDC**, and native gas balances across **Base, Ethereum, Arbitrum, Optimism, Polygon, BSC, and Solana** from scripts, cron jobs, or autonomous agent pipelines.
- Monitoring incoming payouts, bounty deposits, or treasury movements with **balance-change webhook alerts** (`--watch` + `--webhook` / `WALLET_WATCH_WEBHOOK`).
- Guarding operational hot wallets against low gas (`--min-native`), low stablecoin reserves (`--min-usdc`, `--min-usdt`, `--min-stable`), or treasury sweep limits (`--max-stable`).
- Producing deterministic UTF-8 JSON snapshots (`--json`) for dashboards, accounting reconciliations, or downstream automation without pulling `ethers`, `viem`, or `@solana/web3.js`.

## CLI Commands & Examples

Run `scripts/wallet-watch.mjs` from the skill directory:

```bash
# 1. Single-shot balance check across Base, Arbitrum, and Solana
node scripts/wallet-watch.mjs \
  --evm 0x000000000000000000000000000000000000dEaD \
  --chains base,arbitrum \
  --sol 11111111111111111111111111111111

# 2. Query all 6 EVM chains + Solana and emit structured JSON
node scripts/wallet-watch.mjs \
  --evm 0x000000000000000000000000000000000000dEaD \
  --chains all \
  --sol 11111111111111111111111111111111 \
  --json

# 3. Preview threshold alerts locally without sending an HTTP POST (--dry-run)
node scripts/wallet-watch.mjs \
  --evm 0x000000000000000000000000000000000000dEaD \
  --chains base,polygon \
  --min-native 0.01 \
  --min-stable 100 \
  --dry-run \
  --json

# 4. Continuous polling with balance-change + low-gas webhook alerts (Discord / Slack / generic JSON)
WALLET_WATCH_WEBHOOK="https://hooks.example.com/services/..." \
  node scripts/wallet-watch.mjs \
  --evm 0x000000000000000000000000000000000000dEaD \
  --chains base,arbitrum,bsc \
  --sol 11111111111111111111111111111111 \
  --watch 60 \
  --min-delta 1 \
  --min-native 0.005 \
  --max-stable 5000

# 5. Override public RPCs with dedicated endpoints
node scripts/wallet-watch.mjs \
  --evm 0x000000000000000000000000000000000000dEaD \
  --chains base,ethereum \
  --rpc base=https://base-rpc.example.com \
  --rpc ethereum=https://eth-rpc.example.com \
  --json
```

### CLI Flag Reference

| Flag | Default | Purpose |
| --- | --- | --- |
| `--evm <0xAddress>` | `null` | Read-only 40-hex-character EVM wallet address |
| `--sol <SolanaAddress>` | `null` | Read-only Base58 Solana wallet address |
| `--chains <list>` | `base` | Comma-separated EVM chains (`base,ethereum,arbitrum,optimism,polygon,bsc`) or `all` |
| `--rpc <chain=url>` | built-in | Repeatable per-chain RPC override (supports all EVM keys plus `solana`) |
| `--timeout <ms>` | `12000` | Per-RPC request abort timeout in milliseconds (minimum `1000`) |
| `--watch <seconds>` | `0` (once) | Continuous polling interval in seconds (minimum `5`) |
| `--webhook <url>` | env/none | Webhook endpoint for Discord, Slack, or JSON receivers (falls back to `WALLET_WATCH_WEBHOOK`) |
| `--min-delta <usd>` | `0.0001` | Minimum absolute `USDC` or `USDT` delta required to emit a change alert |
| `--min-native <amount>` | disabled | Trigger threshold alert if native balance (`ETH`/`POL`/`BNB`/`SOL`) `< amount` |
| `--min-usdc <amount>` | disabled | Trigger threshold alert if `USDC` balance `< amount` |
| `--min-usdt <amount>` | disabled | Trigger threshold alert if `USDT` balance `< amount` |
| `--min-stable <amount>` | disabled | Trigger threshold alert if `USDC + USDT` (`stableTotal`) `< amount` |
| `--max-stable <amount>` | disabled | Trigger threshold alert if `USDC + USDT` (`stableTotal`) `> amount` |
| `--dry-run` | `false` | Evaluate alerts and print the webhook payload without issuing an HTTP POST |
| `--json` | `false` | Emit UTF-8 JSON output to `stdout` |
| `-h`, `--help` | `false` | Print usage summary and exit `0` |

Environment variables:
- `WALLET_WATCH_WEBHOOK`: Used automatically when `--webhook` is omitted (avoids exposing webhook URLs in process argument lists).
- `WALLET_WATCH_RPC_<CHAIN>`: Per-chain RPC override (e.g., `WALLET_WATCH_RPC_BASE`, `WALLET_WATCH_RPC_ETHEREUM`, `WALLET_WATCH_RPC_SOLANA`).

## JSON Output Schema

### Balance Snapshot (`--json`)

```json
{
  "timestamp": "2026-11-24T12:00:00.000Z",
  "evm": "0x000000000000000000000000000000000000dEaD",
  "sol": "11111111111111111111111111111111",
  "totals": {
    "usdc": 300.0,
    "usdt": 150.5,
    "stableTotal": 450.5
  },
  "balances": [
    {
      "chain": "base",
      "chainId": 8453,
      "nativeSymbol": "ETH",
      "native": 0.125,
      "usdc": 250.0,
      "usdt": 50.5,
      "stableTotal": 300.5
    },
    {
      "chain": "solana",
      "nativeSymbol": "SOL",
      "native": 1.5,
      "usdc": 50.0,
      "usdt": 100.0,
      "stableTotal": 150.0
    }
  ]
}
```

When a single chain fails (HTTP error, timeout, or JSON-RPC error), that entry contains `{ "chain": "<name>", "error": "<reason>" }` while all other chains still return normally. When alerts trigger, `--json` appends `alerts` and `webhook` (`{ dryRun, sent, status | error | payload }`) to the snapshot object.

### Webhook Alert Payload

Webhook deliveries include both `content` (Discord) and `text` (Slack) along with machine-readable `alerts[]` and `balances[]`:

```json
{
  "event": "wallet_watch_alert",
  "timestamp": "2026-11-24T12:00:00.000Z",
  "content": "Wallet Watch Alert (1 event) — 2026-11-24T12:00:00.000Z\n- base USDC changed: 100.0000 -> 250.0000 (+150.0000)",
  "text": "Wallet Watch Alert (1 event) — 2026-11-24T12:00:00.000Z\n- base USDC changed: 100.0000 -> 250.0000 (+150.0000)",
  "wallets": {
    "evm": "0x000000000000000000000000000000000000dEaD",
    "sol": null
  },
  "alerts": [
    {
      "kind": "balance_change",
      "chain": "base",
      "asset": "USDC",
      "previous": 100,
      "current": 250,
      "delta": 150,
      "message": "base USDC changed: 100.0000 -> 250.0000 (+150.0000)"
    }
  ],
  "balances": []
}
```

## Technical Reference

Read [references/chains-and-rpc.md](references/chains-and-rpc.md) for:

- Complete table of supported EVM and Solana networks, Chain IDs, primary/fallback public RPC URLs, and verified USDC/USDT contracts and decimals (including BSC's 18-decimal BEP-20 tokens)
- Raw JSON-RPC 2.0 request/response payloads for `eth_getBalance`, ERC-20 `balanceOf(address)` (`0x70a08231`), Solana `getBalance`, and SPL `getTokenAccountsByOwner`
- Full webhook schema details, threshold deduplication rules, and public RPC rate-limit sizing

## Operational Caveats

- **Public RPC rate limits:** Default endpoints are shared public nodes. Keep `--watch >= 60` when monitoring multiple chains or Solana, and configure dedicated endpoints via `--rpc` or `WALLET_WATCH_RPC_<CHAIN>` for sub-minute polling.
- **Transient RPC failures:** Errors on individual RPC ticks never default balances to `0` and never fire false drop alerts; baseline comparison resumes seamlessly on the next healthy tick.
- **Token scope:** Built-in checks cover canonical mainnet native coins, USDC, and USDT per listed chain. Bridged legacy variants (such as `USDC.e` or `USDbC`) are not aggregated unless queried against their own contract address.

## Ecosystem & Resources

- **Open-Source CLI Repository:** [wallet-watch-cli on GitHub](https://github.com/devbox-zero-ops/wallet-watch-cli) — MIT-licensed source, issue tracker, and releases.
- **Free Local Developer & DeFi Tool Suite:** [XiaheAI Hub](https://devbox-zero-ops.github.io/xiaheai-hub/) — browser-local utilities including DeFi impermanent-loss, gas-adjusted APY, token cost, and JSON/JWT/Regex developer tools.
- **White-Label Self-Hosting Source Kit:** [XiaheAI ZeroSuite Pro](https://devbox-zero-ops.github.io/xiaheai-hub/pro.html) — full multi-tool source bundle for teams extending or self-hosting the toolkit.
