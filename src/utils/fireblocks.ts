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
 * Generate a Fireblocks-compatible private key from an ed25519 seed.
 *
 * @param seed 32-byte seed for ed25519 key generation
 * @returns Fireblocks-compatible private key as hex string with 0x prefix
 */
export function generateFireblocksPrivateKey(seed: Uint8Array): Buffer {
  // Hash the 32-byte seed with SHA-512 (same as ed25519 key derivation)
  const hashed = sha512_sync(Buffer.from(seed))

  // Take first 32 bytes and apply ed25519 clamping
  const head = hashed.slice(0, 32)
  head[0] &= 248 // Clear bottom 3 bits: 0b1111_1000
  head[31] &= 127 // Clear top bit: 0b0111_1111
  head[31] |= 64 // Set second-highest bit: 0b0100_0000

  // Convert clamped bytes to scalar (little-endian) and reduce modulo curve order
  const scalar = etc.mod(bytesToNumberLE(head), edCURVE.n)

  // Convert to hex string with 0x prefix (pad to 64 hex chars = 32 bytes)
  return Buffer.from(scalar.toString(16).padStart(64, '0'), 'hex')
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
