// OpenTimestamps wrapper. Anchors arbitrary content hashes to the Bitcoin
// blockchain via the configured calendar server. Produces a .ots proof that
// can be verified independently.
//
// The proof becomes Bitcoin-confirmed within ~6 hours (one BTC block).
// Verification: anyone with the .ots file + original hash can prove the
// content existed at-or-before the BTC block timestamp.

import { env } from '../env'

interface OtsModule {
  OpenTimestamps: {
    stamp: (detached: unknown) => Promise<void>
    verify: (detached: unknown) => Promise<Record<string, unknown>>
  }
  DetachedTimestampFile: {
    fromHash: (op: unknown, hash: Buffer) => unknown
    deserialize: (bytes: Buffer) => unknown
  }
  Ops: { OpSHA256: new () => unknown }
}

let ots: OtsModule | null = null

async function loadOts(): Promise<OtsModule> {
  if (ots) return ots
  // javascript-opentimestamps is CJS; dynamic import keeps the bundler honest.
  // biome-ignore lint: dynamic import of optional dep
  ots = (await import('javascript-opentimestamps')) as unknown as OtsModule
  return ots
}

export async function stampHash(sha256Hex: string): Promise<Buffer> {
  if (!/^[0-9a-f]{64}$/i.test(sha256Hex)) {
    throw new Error('sha256Hex must be a 64-char hex string')
  }
  const lib = await loadOts()
  const hash = Buffer.from(sha256Hex, 'hex')
  const detached = lib.DetachedTimestampFile.fromHash(
    new lib.Ops.OpSHA256(),
    hash,
  )
  await lib.OpenTimestamps.stamp(detached)
  // serialize via the library's internal method; cast for typing
  const serialized = (
    detached as { serializeToBytes: () => Uint8Array }
  ).serializeToBytes()
  return Buffer.from(serialized)
}

export interface VerificationResult {
  verified: boolean
  btcHeight: number | null
  btcTime: Date | null
  pending: boolean
  rawResult: Record<string, unknown>
}

export async function verifyTimestamp(
  otsBytes: Buffer,
): Promise<VerificationResult> {
  const lib = await loadOts()
  const detached = lib.DetachedTimestampFile.deserialize(otsBytes)
  const raw = await lib.OpenTimestamps.verify(detached)
  const bitcoin = (raw as { bitcoin?: { height?: number; timestamp?: number } })
    .bitcoin
  return {
    verified: bitcoin !== undefined,
    btcHeight: bitcoin?.height ?? null,
    btcTime: bitcoin?.timestamp ? new Date(bitcoin.timestamp * 1000) : null,
    pending: bitcoin === undefined,
    rawResult: raw,
  }
}

export function getCalendarUrl(): string {
  return env.OTS_CALENDAR_URL
}
