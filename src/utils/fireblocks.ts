import { Buffer } from 'buffer'
import { ExtendedPoint, CURVE as edCURVE, etc } from '@noble/ed25519'
import {
  bytesToNumberLE,
  concatBytes,
  numberToBytesLE,
  hexToNumber,
} from '@noble/curves/abstract/utils'
// eslint-disable-next-line camelcase
import { getSecureRandomBytes, sha512_sync } from '@ton/crypto'

/**
 * Get a SHA-512 digest of concatenated byte array messages.
 *
 * @param messages list of byte arrays
 * @returns byte array of SHA-512 digest
 */
const sha512 = async (...messages: Uint8Array[]) => {
  const buffer = concatBytes(...messages)
  return new Uint8Array(sha512_sync(Buffer.from(buffer)))
}

/**
 * Generate a Fireblocks EdDSA signature for a given message and private key.
 *
 * @param privateKey hex-encoded private key(0x...)
 * @param message string or byte array to sign
 * @returns Fireblocks EdDSA signature
 */
export async function FireblocksSign(
  privateKey: string,
  message: string | Uint8Array,
  hasher: (...msgs: Uint8Array[]) => Promise<Uint8Array> = sha512
) {
  if (!privateKey) {
    throw new Error('Cannot sign without a derived private key')
  }

  const privateKeyInt = hexToNumber(privateKey.slice(2))
  const privateKeyBytes = numberToBytesLE(privateKeyInt, 32)
  const messagesBytes = typeof message === 'string' ? Buffer.from(message, 'hex') : message
  const messageBytes = concatBytes(messagesBytes)

  const seed = new Uint8Array(await getSecureRandomBytes(32))

  const nonceDigest = await hasher(seed, privateKeyBytes, messageBytes)
  const nonce = etc.mod(bytesToNumberLE(nonceDigest), edCURVE.n)

  const R = ExtendedPoint.BASE.multiply(nonce)
  const A = ExtendedPoint.BASE.multiply(privateKeyInt)

  const serializedR = R.toRawBytes()
  const serializedA = A.toRawBytes()

  const hramDigest = await hasher(serializedR, serializedA, messageBytes)
  const hram = etc.mod(bytesToNumberLE(hramDigest), edCURVE.n)

  const s = etc.mod(hram * privateKeyInt + nonce, edCURVE.n)
  const signature = concatBytes(serializedR, numberToBytesLE(s, 32))

  return signature
}
