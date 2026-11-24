#!/usr/bin/env node
import { pathToFileURL } from "node:url"

/**
 * wallet-watch — Zero-dependency multi-chain USDT, USDC, and native balance watcher.
 * Supports Base, Ethereum, Arbitrum, Optimism, Polygon, BSC (EVM) and Solana via JSON-RPC.
 * No SDKs, no API keys required, no private keys — 100% read-only.
 */

export const CHAINS = {
  base: {
    chainId: 8453,
    rpc: "https://mainnet.base.org",
    fallbackRpcs: ["https://base-rpc.publicnode.com"],
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    usdcDecimals: 6,
    usdt: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    usdtDecimals: 6,
  },
  ethereum: {
    chainId: 1,
    rpc: "https://ethereum-rpc.publicnode.com",
    fallbackRpcs: ["https://1rpc.io/eth"],
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    usdcDecimals: 6,
    usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    usdtDecimals: 6,
  },
  arbitrum: {
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    fallbackRpcs: ["https://arbitrum-one-rpc.publicnode.com"],
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    usdcDecimals: 6,
    usdt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    usdtDecimals: 6,
  },
  optimism: {
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    fallbackRpcs: ["https://optimism-rpc.publicnode.com"],
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    usdcDecimals: 6,
    usdt: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    usdtDecimals: 6,
  },
  polygon: {
    chainId: 137,
    rpc: "https://polygon-bor-rpc.publicnode.com",
    fallbackRpcs: ["https://1rpc.io/matic"],
    nativeSymbol: "POL",
    nativeDecimals: 18,
    usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    usdcDecimals: 6,
    usdt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    usdtDecimals: 6,
  },
  bsc: {
    chainId: 56,
    rpc: "https://bsc-dataseed.binance.org",
    fallbackRpcs: ["https://bsc-rpc.publicnode.com"],
    nativeSymbol: "BNB",
    nativeDecimals: 18,
    usdc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    usdcDecimals: 18,
    usdt: "0x55d398326f99059fF775485246999027B3197955",
    usdtDecimals: 18,
  },
}

export const SOLANA_CONFIG = {
  chain: "solana",
  rpc: "https://api.mainnet-beta.solana.com",
  fallbackRpcs: ["https://solana-rpc.publicnode.com"],
  nativeSymbol: "SOL",
  nativeDecimals: 9,
  usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  usdtMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
}

const SOLANA_BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const DEFAULT_TIMEOUT_MS = 12000

export function encodeBalanceOf(address) {
  if (typeof address !== "string") {
    throw new Error(`Invalid EVM address: ${String(address)}`)
  }
  const clean = address.trim().toLowerCase().replace(/^0x/, "")
  if (!/^[0-9a-f]{40}$/.test(clean)) {
    throw new Error(`Invalid EVM address: ${address}`)
  }
  return "0x70a08231" + clean.padStart(64, "0")
}

export function isValidSolanaAddress(address) {
  return typeof address === "string" && SOLANA_BASE58_RE.test(address.trim())
}

export function formatUnits(hexOrBigInt, decimals) {
  let raw = 0n
  if (typeof hexOrBigInt === "bigint") {
    raw = hexOrBigInt
  } else if (typeof hexOrBigInt === "string") {
    const trimmed = hexOrBigInt.trim()
    if (!trimmed || trimmed === "0x" || trimmed === "0X") {
      return 0
    }
    raw = BigInt(trimmed)
  } else if (typeof hexOrBigInt === "number" && Number.isFinite(hexOrBigInt)) {
    raw = BigInt(Math.trunc(hexOrBigInt))
  }
  if (raw === 0n) return 0
  const negative = raw < 0n
  const abs = negative ? -raw : raw
  const base = 10n ** BigInt(decimals)
  const whole = abs / base
  const frac = (abs % base).toString().padStart(decimals, "0").replace(/0+$/, "")
  const str = `${negative ? "-" : ""}${whole.toString()}${frac ? "." + frac : ""}`
  return Number(str)
}

function roundAmount(value, digits = 6) {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export async function rpcCall(urls, payload, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const fetchImpl = options.fetchImpl ?? fetch
  const candidates = Array.isArray(urls) ? urls.filter(Boolean) : [urls]
  if (candidates.length === 0) {
    throw new Error("No RPC URL provided")
  }

  let lastError = null
  for (const url of candidates) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "wallet-watch-cli/1.1",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${url}`)
      }
      const data = await res.json()
      if (data && data.error) {
        const msg = data.error.message || JSON.stringify(data.error)
        const code = data.error.code !== undefined ? ` (${data.error.code})` : ""
        throw new Error(`RPC error${code}: ${msg}`)
      }
      if (!data || !("result" in data)) {
        throw new Error(`Malformed JSON-RPC response from ${url}`)
      }
      return data
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError ?? new Error("RPC call failed")
}

export async function checkEvmChain(chainKey, address, options = {}) {
  const cfg = CHAINS[chainKey]
  if (!cfg) {
    throw new Error(`Unsupported EVM chain: ${chainKey}`)
  }
  const calldata = encodeBalanceOf(address)
  const urls = options.rpcOverride
    ? [options.rpcOverride]
    : [cfg.rpc, ...(cfg.fallbackRpcs || [])]

  const [nativeRes, usdcRes, usdtRes] = await Promise.all([
    rpcCall(
      urls,
      { jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] },
      options,
    ),
    rpcCall(
      urls,
      { jsonrpc: "2.0", id: 2, method: "eth_call", params: [{ to: cfg.usdc, data: calldata }, "latest"] },
      options,
    ),
    rpcCall(
      urls,
      { jsonrpc: "2.0", id: 3, method: "eth_call", params: [{ to: cfg.usdt, data: calldata }, "latest"] },
      options,
    ),
  ])

  const native = formatUnits(nativeRes.result, cfg.nativeDecimals)
  const usdc = formatUnits(usdcRes.result, cfg.usdcDecimals)
  const usdt = formatUnits(usdtRes.result, cfg.usdtDecimals)

  return {
    chain: chainKey,
    chainId: cfg.chainId,
    nativeSymbol: cfg.nativeSymbol,
    native,
    usdc,
    usdt,
    stableTotal: roundAmount(usdc + usdt, 6),
  }
}

function sumSolanaTokenAccounts(tokenAccountsResponse) {
  let total = 0
  for (const acc of tokenAccountsResponse?.result?.value ?? []) {
    const info = acc?.account?.data?.parsed?.info?.tokenAmount
    if (info && info.uiAmountString !== undefined) {
      total += Number(info.uiAmountString)
    } else if (info && info.uiAmount !== undefined && info.uiAmount !== null) {
      total += Number(info.uiAmount)
    }
  }
  return roundAmount(total, 6)
}

export async function checkSolana(address, options = {}) {
  if (!isValidSolanaAddress(address)) {
    throw new Error(`Invalid Solana address: ${address}`)
  }
  const urls = options.rpcOverride
    ? [options.rpcOverride]
    : [SOLANA_CONFIG.rpc, ...(SOLANA_CONFIG.fallbackRpcs || [])]

  const [balRes, usdcRes, usdtRes] = await Promise.all([
    rpcCall(
      urls,
      { jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] },
      options,
    ),
    rpcCall(
      urls,
      {
        jsonrpc: "2.0",
        id: 2,
        method: "getTokenAccountsByOwner",
        params: [address, { mint: SOLANA_CONFIG.usdcMint }, { encoding: "jsonParsed" }],
      },
      options,
    ),
    rpcCall(
      urls,
      {
        jsonrpc: "2.0",
        id: 3,
        method: "getTokenAccountsByOwner",
        params: [address, { mint: SOLANA_CONFIG.usdtMint }, { encoding: "jsonParsed" }],
      },
      options,
    ),
  ])

  const native = formatUnits(balRes?.result?.value ?? 0, SOLANA_CONFIG.nativeDecimals)
  const usdc = sumSolanaTokenAccounts(usdcRes)
  const usdt = sumSolanaTokenAccounts(usdtRes)

  return {
    chain: "solana",
    nativeSymbol: SOLANA_CONFIG.nativeSymbol,
    native,
    usdc,
    usdt,
    stableTotal: roundAmount(usdc + usdt, 6),
  }
}

function parseOptionalNumber(val, flagName) {
  const num = Number(val)
  if (val === undefined || Number.isNaN(num) || !Number.isFinite(num) || num < 0) {
    throw new Error(`Invalid numeric value for ${flagName}: ${val}`)
  }
  return num
}

export function parseArgs(argv) {
  const opts = {
    evm: null,
    sol: null,
    chains: ["base"],
    rpcOverrides: {},
    watch: 0,
    webhook: null,
    minDelta: 0.0001,
    minNative: null,
    minUsdc: null,
    minUsdt: null,
    minStable: null,
    maxStable: null,
    timeout: DEFAULT_TIMEOUT_MS,
    dryRun: false,
    json: false,
    help: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--evm") {
      opts.evm = argv[++i]
    } else if (a === "--sol") {
      opts.sol = argv[++i]
    } else if (a === "--chains") {
      const raw = (argv[++i] || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
      opts.chains = raw.includes("all") ? Object.keys(CHAINS) : raw
    } else if (a === "--rpc") {
      const pair = argv[++i] || ""
      const eq = pair.indexOf("=")
      if (eq <= 0 || eq === pair.length - 1) {
        throw new Error(`Invalid --rpc format (expected chain=url): ${pair}`)
      }
      const key = pair.slice(0, eq).trim().toLowerCase()
      const url = pair.slice(eq + 1).trim()
      opts.rpcOverrides[key] = url
    } else if (a === "--watch") {
      opts.watch = Math.max(5, Number(argv[++i]) || 60)
    } else if (a === "--webhook") {
      opts.webhook = argv[++i]
    } else if (a === "--min-delta") {
      opts.minDelta = parseOptionalNumber(argv[++i], "--min-delta")
    } else if (a === "--min-native") {
      opts.minNative = parseOptionalNumber(argv[++i], "--min-native")
    } else if (a === "--min-usdc") {
      opts.minUsdc = parseOptionalNumber(argv[++i], "--min-usdc")
    } else if (a === "--min-usdt") {
      opts.minUsdt = parseOptionalNumber(argv[++i], "--min-usdt")
    } else if (a === "--min-stable") {
      opts.minStable = parseOptionalNumber(argv[++i], "--min-stable")
    } else if (a === "--max-stable") {
      opts.maxStable = parseOptionalNumber(argv[++i], "--max-stable")
    } else if (a === "--timeout") {
      opts.timeout = Math.max(1000, parseOptionalNumber(argv[++i], "--timeout"))
    } else if (a === "--dry-run") {
      opts.dryRun = true
    } else if (a === "--json") {
      opts.json = true
    } else if (a === "-h" || a === "--help") {
      opts.help = true
    } else {
      throw new Error(`Unknown option: ${a}`)
    }
  }
  return opts
}

export function evaluateAlerts(prevSnapshot, currSnapshot, opts, activeThresholds = new Set()) {
  const alerts = []
  const nextThresholds = new Set()
  const prevByChain = new Map()
  if (prevSnapshot && Array.isArray(prevSnapshot.balances)) {
    for (const item of prevSnapshot.balances) {
      if (!item.error) prevByChain.set(item.chain, item)
    }
  }

  const minDelta = opts.minDelta ?? 0.0001
  const nativeEps = 1e-8

  for (const b of currSnapshot.balances) {
    if (b.error) {
      for (const k of activeThresholds) {
        if (k.startsWith(`${b.chain}:`)) nextThresholds.add(k)
      }
      continue
    }

    const prev = prevByChain.get(b.chain)
    if (prev) {
      const checks = [
        { asset: "USDC", before: prev.usdc, after: b.usdc, eps: minDelta, digits: 4 },
        { asset: "USDT", before: prev.usdt, after: b.usdt, eps: minDelta, digits: 4 },
        { asset: b.nativeSymbol, before: prev.native, after: b.native, eps: nativeEps, digits: 6 },
      ]
      for (const c of checks) {
        const delta = roundAmount(c.after - c.before, 8)
        if (Math.abs(delta) >= c.eps && delta !== 0) {
          const sign = delta > 0 ? "+" : ""
          alerts.push({
            kind: "balance_change",
            chain: b.chain,
            asset: c.asset,
            previous: c.before,
            current: c.after,
            delta,
            message: `${b.chain} ${c.asset} changed: ${c.before.toFixed(c.digits)} -> ${c.after.toFixed(c.digits)} (${sign}${delta.toFixed(c.digits)})`,
          })
        }
      }
    }

    const thresholdRules = [
      {
        enabled: opts.minNative !== null && opts.minNative !== undefined,
        key: `${b.chain}:min_native`,
        breached: b.native < opts.minNative,
        asset: b.nativeSymbol,
        operator: "<",
        threshold: opts.minNative,
        current: b.native,
        digits: 6,
      },
      {
        enabled: opts.minUsdc !== null && opts.minUsdc !== undefined,
        key: `${b.chain}:min_usdc`,
        breached: b.usdc < opts.minUsdc,
        asset: "USDC",
        operator: "<",
        threshold: opts.minUsdc,
        current: b.usdc,
        digits: 4,
      },
      {
        enabled: opts.minUsdt !== null && opts.minUsdt !== undefined,
        key: `${b.chain}:min_usdt`,
        breached: b.usdt < opts.minUsdt,
        asset: "USDT",
        operator: "<",
        threshold: opts.minUsdt,
        current: b.usdt,
        digits: 4,
      },
      {
        enabled: opts.minStable !== null && opts.minStable !== undefined,
        key: `${b.chain}:min_stable`,
        breached: b.stableTotal < opts.minStable,
        asset: "USDC+USDT",
        operator: "<",
        threshold: opts.minStable,
        current: b.stableTotal,
        digits: 4,
      },
      {
        enabled: opts.maxStable !== null && opts.maxStable !== undefined,
        key: `${b.chain}:max_stable`,
        breached: b.stableTotal > opts.maxStable,
        asset: "USDC+USDT",
        operator: ">",
        threshold: opts.maxStable,
        current: b.stableTotal,
        digits: 4,
      },
    ]

    for (const r of thresholdRules) {
      if (!r.enabled || !r.breached) continue
      nextThresholds.add(r.key)
      if (!activeThresholds.has(r.key)) {
        alerts.push({
          kind: "threshold",
          chain: b.chain,
          asset: r.asset,
          operator: r.operator,
          threshold: r.threshold,
          current: r.current,
          message: `${b.chain} ${r.asset} threshold triggered: ${r.current.toFixed(r.digits)} ${r.operator} ${r.threshold}`,
        })
      }
    }
  }

  return { alerts, activeThresholds: nextThresholds }
}

export function buildWebhookPayload(snapshot, alerts) {
  const lines = [
    `Wallet Watch Alert (${alerts.length} ${alerts.length === 1 ? "event" : "events"}) — ${snapshot.timestamp}`,
    ...alerts.map((a) => `- ${a.message}`),
  ]
  const summary = lines.join("\n")
  return {
    event: "wallet_watch_alert",
    timestamp: snapshot.timestamp,
    content: summary,
    text: summary,
    wallets: {
      evm: snapshot.evm,
      sol: snapshot.sol,
    },
    alerts,
    balances: snapshot.balances,
  }
}

export async function sendWebhook(url, payload, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const fetchImpl = options.fetchImpl ?? fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "wallet-watch-cli/1.1",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`Webhook HTTP ${res.status}`)
    }
    return { ok: true, status: res.status }
  } finally {
    clearTimeout(timer)
  }
}

export async function runOnce(opts, runtimeOptions = {}) {
  const results = []
  const timeoutMs = opts.timeout ?? DEFAULT_TIMEOUT_MS
  const fetchImpl = runtimeOptions.fetchImpl ?? fetch

  if (opts.evm) {
    const evmChecks = await Promise.all(
      opts.chains.map(async (c) => {
        try {
          const rpcOverride = opts.rpcOverrides?.[c]
          return await checkEvmChain(c, opts.evm, { rpcOverride, timeoutMs, fetchImpl })
        } catch (err) {
          return { chain: c, error: String(err?.message || err) }
        }
      }),
    )
    results.push(...evmChecks)
  }

  if (opts.sol) {
    try {
      const rpcOverride = opts.rpcOverrides?.solana
      results.push(await checkSolana(opts.sol, { rpcOverride, timeoutMs, fetchImpl }))
    } catch (err) {
      results.push({ chain: "solana", error: String(err?.message || err) })
    }
  }

  let totalUsdc = 0
  let totalUsdt = 0
  for (const r of results) {
    if (!r.error) {
      totalUsdc += r.usdc
      totalUsdt += r.usdt
    }
  }

  return {
    timestamp: new Date().toISOString(),
    evm: opts.evm,
    sol: opts.sol,
    totals: {
      usdc: roundAmount(totalUsdc, 6),
      usdt: roundAmount(totalUsdt, 6),
      stableTotal: roundAmount(totalUsdc + totalUsdt, 6),
    },
    balances: results,
  }
}

function resolveEnvOverrides(opts) {
  const merged = { ...opts, rpcOverrides: { ...opts.rpcOverrides } }
  if (!merged.webhook && process.env.WALLET_WATCH_WEBHOOK) {
    merged.webhook = process.env.WALLET_WATCH_WEBHOOK
  }
  for (const chain of [...Object.keys(CHAINS), "solana"]) {
    const envKey = `WALLET_WATCH_RPC_${chain.toUpperCase()}`
    if (!merged.rpcOverrides[chain] && process.env[envKey]) {
      merged.rpcOverrides[chain] = process.env[envKey]
    }
  }
  return merged
}

function printHelp() {
  console.log(`wallet-watch — Zero-dependency multi-chain USDT/USDC & native balance watcher (read-only)

Usage:
  node scripts/wallet-watch.mjs [options]

Wallet & Chain Options:
  --evm <0xAddress>        Read-only EVM wallet address (40 hex chars)
  --sol <SolanaAddress>    Read-only Solana wallet address (Base58)
  --chains <list>          Comma-separated EVM chains or "all" (default: base)
                           Supported: ${Object.keys(CHAINS).join(", ")}
  --rpc <chain=url>        Override RPC URL for a chain (repeatable, incl. solana)
  --timeout <ms>           Per-RPC timeout in milliseconds (default: 12000)

Monitoring & Alert Options:
  --watch <seconds>        Poll continuously every N seconds (minimum: 5)
  --webhook <url>          Webhook URL for alerts (or set WALLET_WATCH_WEBHOOK)
  --min-delta <usd>        Min USDC/USDT delta for change alerts (default: 0.0001)
  --min-native <amount>    Alert when native gas token drops below threshold
  --min-usdc <amount>      Alert when USDC balance drops below threshold
  --min-usdt <amount>      Alert when USDT balance drops below threshold
  --min-stable <amount>    Alert when USDC+USDT balance drops below threshold
  --max-stable <amount>    Alert when USDC+USDT balance exceeds threshold
  --dry-run                Print alert webhook payload without sending HTTP POST

Output & Misc:
  --json                   Output structured JSON to stdout
  -h, --help               Show this help message and exit

Environment Variables:
  WALLET_WATCH_WEBHOOK          Default webhook URL when --webhook is omitted
  WALLET_WATCH_RPC_<CHAIN>      Per-chain RPC override (e.g. WALLET_WATCH_RPC_BASE)`)
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2))
  if (parsed.help) {
    printHelp()
    process.exit(0)
  }
  if (!parsed.evm && !parsed.sol) {
    printHelp()
    process.exit(1)
  }

  const opts = resolveEnvOverrides(parsed)
  let prevGoodByChain = new Map()
  let activeThresholds = new Set()

  const tick = async () => {
    const snap = await runOnce(opts)
    const prevSnapshot =
      prevGoodByChain.size > 0 ? { balances: Array.from(prevGoodByChain.values()) } : null
    const { alerts, activeThresholds: nextThresholds } = evaluateAlerts(
      prevSnapshot,
      snap,
      opts,
      activeThresholds,
    )
    activeThresholds = nextThresholds
    for (const b of snap.balances) {
      if (!b.error) prevGoodByChain.set(b.chain, b)
    }

    let webhookResult = null
    if (alerts.length > 0 && (opts.webhook || opts.dryRun)) {
      const payload = buildWebhookPayload(snap, alerts)
      if (opts.dryRun || !opts.webhook) {
        webhookResult = { dryRun: true, sent: false, payload }
      } else {
        try {
          const delivery = await sendWebhook(opts.webhook, payload, { timeoutMs: opts.timeout })
          webhookResult = { dryRun: false, sent: true, status: delivery.status }
        } catch (err) {
          webhookResult = { dryRun: false, sent: false, error: String(err?.message || err) }
        }
      }
    }

    if (opts.json) {
      const out = alerts.length > 0 ? { ...snap, alerts, webhook: webhookResult } : snap
      console.log(JSON.stringify(out, null, 2))
    } else {
      console.log(`[${snap.timestamp}]`)
      for (const b of snap.balances) {
        if (b.error) {
          console.log(`  ${b.chain}: ERROR (${b.error})`)
        } else {
          console.log(
            `  ${b.chain}: ${b.usdc.toFixed(4)} USDC | ${b.usdt.toFixed(4)} USDT | ${b.native.toFixed(6)} ${b.nativeSymbol}`,
          )
        }
      }
      console.log(
        `  total stables: ${snap.totals.usdc.toFixed(4)} USDC + ${snap.totals.usdt.toFixed(4)} USDT = ${snap.totals.stableTotal.toFixed(4)} USD`,
      )
      for (const a of alerts) {
        console.log(`  ALERT [${a.kind}]: ${a.message}`)
      }
      if (webhookResult?.dryRun) {
        console.log(`  WEBHOOK [dry-run]: ${JSON.stringify(webhookResult.payload)}`)
      } else if (webhookResult?.error) {
        console.error(`  WEBHOOK ERROR: ${webhookResult.error}`)
      }
    }
  }

  await tick()
  if (opts.watch > 0) {
    let polling = false
    const timer = setInterval(() => {
      if (polling) return
      polling = true
      tick()
        .catch((err) => console.error(`Poll error: ${err?.message || err}`))
        .finally(() => {
          polling = false
        })
    }, opts.watch * 1000)
    const stop = () => {
      clearInterval(timer)
      process.exit(0)
    }
    process.on("SIGINT", stop)
    process.on("SIGTERM", stop)
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href.toLowerCase() === import.meta.url.toLowerCase()
) {
  main().catch((err) => {
    console.error(err?.message || err)
    process.exit(1)
  })
}
