# Chains, JSON-RPC Payloads, Webhook Schema & Rate Limits

Technical reference for `scripts/wallet-watch.mjs`. All token contracts and decimals listed below are mainnet constants verified via live read-only JSON-RPC calls.

## Supported Networks & Token Contracts

### EVM Chains

| Chain Key | Network | Chain ID | Native (Decimals) | Primary / Fallback Public RPC | USDC Contract (Decimals) | USDT Contract (Decimals) |
| --- | --- | ---: | --- | --- | --- | --- |
| `base` | Base Mainnet | 8453 | `ETH` (18) | `https://mainnet.base.org`<br>`https://base-rpc.publicnode.com` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (6) | `0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2` (6) |
| `ethereum` | Ethereum Mainnet | 1 | `ETH` (18) | `https://ethereum-rpc.publicnode.com`<br>`https://1rpc.io/eth` | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` (6) | `0xdAC17F958D2ee523a2206206994597C13D831ec7` (6) |
| `arbitrum` | Arbitrum One | 42161 | `ETH` (18) | `https://arb1.arbitrum.io/rpc`<br>`https://arbitrum-one-rpc.publicnode.com` | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` (6) | `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` (6) |
| `optimism` | OP Mainnet | 10 | `ETH` (18) | `https://mainnet.optimism.io`<br>`https://optimism-rpc.publicnode.com` | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` (6) | `0x94b008aA00579c1307B0EF2c499aD98a8ce58e58` (6) |
| `polygon` | Polygon PoS | 137 | `POL` (18) | `https://polygon-bor-rpc.publicnode.com`<br>`https://1rpc.io/matic` | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` (6) | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` (6) |
| `bsc` | BNB Smart Chain | 56 | `BNB` (18) | `https://bsc-dataseed.binance.org`<br>`https://bsc-rpc.publicnode.com` | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` (**18**) | `0x55d398326f99059fF775485246999027B3197955` (**18**) |

> **Decimal note:** Binance-Peg USDC and USDT on `bsc` use **18 decimals**, whereas USDC and USDT on Ethereum, Base, Arbitrum, Optimism, Polygon, and Solana use **6 decimals**. `wallet-watch.mjs` scales each token with its per-chain `usdcDecimals` and `usdtDecimals` using exact `BigInt` division before float formatting.

### Solana Mainnet-Beta

| Chain Key | Cluster | Native (Decimals) | Primary / Fallback Public RPC | USDC SPL Mint (Decimals) | USDT SPL Mint (Decimals) |
| --- | --- | --- | --- | --- | --- |
| `solana` | Mainnet-Beta | `SOL` (9) | `https://api.mainnet-beta.solana.com`<br>`https://solana-rpc.publicnode.com` | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (6) | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` (6) |

---

## Raw JSON-RPC 2.0 Payloads (Zero SDK)

### 1. EVM Native Balance (`eth_getBalance`)

Request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "eth_getBalance",
  "params": ["0x000000000000000000000000000000000000dEaD", "latest"]
}
```

Response (`result` is hex wei, divided by `10^18`):

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "0x1bc16d674ec80000"
}
```

### 2. EVM ERC-20 `balanceOf(address)` (`eth_call`)

ABI encoding rule:
- 4-byte function selector: `keccak256("balanceOf(address)")[0:4]` = `0x70a08231`
- 32-byte ABI-encoded `address` argument: strip `0x`, lowercase, left-pad with zeros to 64 hex characters
- Total calldata length: `2 + 8 + 64 = 74` characters

Example for `0x000000000000000000000000000000000000dEaD`:

```text
0x70a08231000000000000000000000000000000000000000000000000000000000000dead
```

Request (USDC on Base):

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "eth_call",
  "params": [
    {
      "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "data": "0x70a08231000000000000000000000000000000000000000000000000000000000000dead"
    },
    "latest"
  ]
}
```

Response (`result` is 32-byte hex `uint256`, divided by `10^decimals`; empty `"0x"` is treated as `0`):

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": "0x000000000000000000000000000000000000000000000000000000000ee6b280"
}
```

### 3. Solana Native Balance (`getBalance`)

Request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getBalance",
  "params": ["11111111111111111111111111111111"]
}
```

Response (`result.value` is lamports, divided by `10^9` = SOL):

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "context": { "slot": 300000000 },
    "value": 1500000000
  }
}
```

### 4. Solana SPL Token Balance (`getTokenAccountsByOwner`)

Request (USDC SPL mint with `jsonParsed` encoding):

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "getTokenAccountsByOwner",
  "params": [
    "11111111111111111111111111111111",
    { "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
    { "encoding": "jsonParsed" }
  ]
}
```

Response (an owner can hold multiple token accounts for the same mint; `wallet-watch.mjs` sums `tokenAmount.uiAmountString` across all entries in `result.value`):

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "context": { "slot": 300000000 },
    "value": [
      {
        "pubkey": "<TOKEN_ACCOUNT_PUBKEY>",
        "account": {
          "data": {
            "program": "spl-token",
            "parsed": {
              "type": "account",
              "info": {
                "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                "tokenAmount": {
                  "amount": "250000000",
                  "decimals": 6,
                  "uiAmount": 250,
                  "uiAmountString": "250"
                }
              }
            }
          }
        }
      }
    ]
  }
}
```

---

## Webhook JSON Schema

When a balance change or threshold breach fires (and `--webhook` or `WALLET_WATCH_WEBHOOK` is configured), `wallet-watch.mjs` sends an HTTP `POST` with `Content-Type: application/json`:

```json
{
  "event": "wallet_watch_alert",
  "timestamp": "2026-11-24T12:00:00.000Z",
  "content": "Wallet Watch Alert (2 events) — 2026-11-24T12:00:00.000Z\n- base USDC changed: 100.0000 -> 250.0000 (+150.0000)\n- base ETH threshold triggered: 0.004000 < 0.01",
  "text": "Wallet Watch Alert (2 events) — 2026-11-24T12:00:00.000Z\n- base USDC changed: 100.0000 -> 250.0000 (+150.0000)\n- base ETH threshold triggered: 0.004000 < 0.01",
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
    },
    {
      "kind": "threshold",
      "chain": "base",
      "asset": "ETH",
      "operator": "<",
      "threshold": 0.01,
      "current": 0.004,
      "message": "base ETH threshold triggered: 0.004000 < 0.01"
    }
  ],
  "balances": [
    {
      "chain": "base",
      "chainId": 8453,
      "nativeSymbol": "ETH",
      "native": 0.004,
      "usdc": 250,
      "usdt": 0,
      "stableTotal": 250
    }
  ]
}
```

### Field Notes

- `content` & `text`: Identical human-readable multi-line summaries so the same payload works directly with **Discord** (`content`), **Slack** (`text`), and generic automation endpoints.
- `alerts[].kind`: Either `"balance_change"` (includes `previous`, `current`, `delta`) or `"threshold"` (includes `operator` `"<"` or `">"`, `threshold`, `current`).
- **Threshold deduplication:** In `--watch` mode, each `(chain, rule)` threshold alert fires once when entered and re-arms only after the balance recovers back inside bounds.
- **Transient RPC error isolation:** Any JSON-RPC `error` payload or HTTP failure records `{ "chain": "<name>", "error": "..." }` instead of defaulting to `0`. Errored ticks never fire false zero-balance or drop alerts and preserve the last known good balance for the next successful tick.

---

## Rate-Limit & Reliability Guidance

- **Request volume per poll:** Each checked chain issues `3` parallel JSON-RPC calls (`native` + `USDC` + `USDT`). Watching 4 chains every 60s sends `12` requests/minute (`0.2 req/s`).
- **Recommended public RPC polling intervals:**
  - 1–2 chains: `--watch 30` or higher
  - 3–6 chains: `--watch 60` or higher
  - All 6 EVM chains + Solana: `--watch 90` to `--watch 120`
  - Solana public mainnet RPC enforces stricter burst limits (`HTTP 429`); keep `--watch >= 60` when polling `solana` on the default endpoint, or pass a dedicated endpoint.
- **Automatic fallback:** Every built-in network configures a primary public RPC and a fallback public RPC. On HTTP `429`/`5xx`, timeout, or JSON-RPC error, `rpcCall` automatically retries the fallback endpoint before reporting a chain error.
- **Dedicated RPC overrides:** For high-frequency monitoring (`--watch 10` to `--watch 30`), supply your own provider URL via CLI flags or environment variables:
  ```bash
  WALLET_WATCH_RPC_BASE="https://your-base-rpc.example.com" \
  WALLET_WATCH_RPC_SOLANA="https://your-solana-rpc.example.com" \
    node scripts/wallet-watch.mjs --evm 0x... --sol ... --watch 15
  ```
- **Non-overlapping polls:** Watch ticks are guarded against overlap; if an RPC call takes longer than the interval, the next tick waits rather than queuing parallel request bursts.
