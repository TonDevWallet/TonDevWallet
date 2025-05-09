import { Address } from '@ton/core'
import { createTextBinaryHash, createCellHash } from './hash'
import { SignDataPayload } from '@tonconnect/protocol'
import { ed25519 } from '@noble/curves/ed25519'

export interface SignDataParams {
  payload: SignDataPayload
  domain: string
  privateKey: Buffer
  address: string
}

export interface SignDataResult {
  signature: string // base64
  address: string
  timestamp: number
  domain: string
  payload: SignDataPayload
}
/**
 * Signs data according to TON Connect sign-data protocol.
 *
 * Supports three payload types:
 * 1. text - for text messages
 * 2. binary - for arbitrary binary data
 * 3. cell - for TON Cell with TL-B schema
 *
 * @param params Signing parameters
 * @returns Signed data with base64 signature
 */
export function SignTonConnectData(params: SignDataParams): SignDataResult {
  const { payload, domain, privateKey, address } = params
  const timestamp = Math.floor(Date.now() / 1000)
  const parsedAddr = Address.parse(address)

  // Create hash based on payload type
  const finalHash =
    payload.type === 'cell'
      ? createCellHash(payload, parsedAddr, domain, timestamp)
      : createTextBinaryHash(payload, parsedAddr, domain, timestamp)

  // Sign with Ed25519
  const signature = ed25519.sign(new Uint8Array(finalHash), new Uint8Array(privateKey))

  return {
    signature: Buffer.from(signature).toString('base64'),
    address,
    timestamp,
    domain,
    payload,
  }
}
