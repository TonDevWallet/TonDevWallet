import { beginCell, Cell, loadMessage, storeMessage } from '@ton/core'
import { ToncenterV3Traces } from '@/utils/retracer/traces'

/** TON Center HTTP API v3 (see securityDefinitions in doc.json). */
export const TONCENTER_V3_API_KEY_HEADER = 'X-Api-Key' as const

export function toncenterV3RequestHeaders(apiKey?: string | null): Record<string, string> {
  const k = apiKey?.trim()
  if (!k) return {}
  return { [TONCENTER_V3_API_KEY_HEADER]: k }
}

export function bigIntToBuffer(data: bigint | undefined): Buffer {
  if (!data) {
    return Buffer.from([])
  }
  const hexStr = data.toString(16)
  const pad = hexStr.padStart(64, '0')
  const hashHex = Buffer.from(pad, 'hex')

  return hashHex
}

export function bigIntToHex(data: bigint | undefined): string {
  if (!data) {
    return ''
  }
  const hexStr = data.toString(16)
  const pad = hexStr.padStart(64, '0')

  return pad
}

export function tonToNumber(ton: bigint | number): number {
  return Number(ton) / 10 ** 9
}

export function NormalizeMessage(cell: Cell): Cell {
  const msg = loadMessage(cell.beginParse())
  if (msg.init) {
    msg.init = null
  }
  if (msg.info.type === 'external-in') {
    msg.info.src = null
    msg.info.importFee = 0n
  }

  return beginCell()
    .store(storeMessage(msg, { forceRef: true }))
    .endCell()
}

/**
 * Fetches trace information from toncenter.
 *
 * @param hash   Transaction hash to query (hex string without 0x prefix).
 * @param isTestnet Whether to use testnet endpoint.
 * @param pending   When true, fetches data from the `pendingTraces` endpoint instead of `traces`.
 * @param signal    Optional AbortSignal for cancellation.
 */
export async function fetchToncenterTrace({
  hash,
  isTestnet = false,
  pending = false,
  toncenter3Url,
  toncenterApiKey,
  signal,
}: {
  hash: string
  isTestnet?: boolean
  toncenter3Url?: string
  /** TON Center v3 API key (sent as `X-Api-Key`). */
  toncenterApiKey?: string
  pending?: boolean
  signal?: AbortSignal
}): Promise<ToncenterV3Traces> {
  const endpoint = pending ? 'pendingTraces' : 'traces'
  const hashParam = pending ? 'ext_msg_hash' : 'msg_hash'
  const apiUrl = `${getToncenter3Url(isTestnet, toncenter3Url)}${endpoint}?${hashParam}=${hash}`

  const res = await fetch(apiUrl, { signal, headers: toncenterV3RequestHeaders(toncenterApiKey) })
  if (res.status !== 200) {
    throw new Error(`Failed to fetch trace data: HTTP ${res.status}`)
  }

  return (await res.json()) as ToncenterV3Traces
}

export function getToncenter3Url(isTestnet?: boolean, toncenter3Url?: string) {
  if (toncenter3Url) {
    return toncenter3Url
  }
  return `https://${isTestnet ? 'testnet.' : ''}toncenter.com/api/v3/`
}
