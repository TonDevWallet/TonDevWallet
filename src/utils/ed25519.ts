import { type KeyPair } from '@ton/crypto'
import { ed25519, x25519 } from '@noble/curves/ed25519'
import { randomBytes } from '@noble/hashes/utils'
export function secretKeyToED25519(secretKey: Buffer | Uint8Array): KeyPair {
  const publicKey = ed25519.getPublicKey(secretKey)

  return {
    secretKey: Buffer.from(secretKey),
    publicKey: Buffer.from(publicKey),
  }
}

export function secretKeyToX25519(secretKey: Buffer | Uint8Array): KeyPair {
  const publicKey = x25519.getPublicKey(secretKey)

  return {
    secretKey: Buffer.from(secretKey),
    publicKey: Buffer.from(publicKey),
  }
}

export function randomED25519() {
  return secretKeyToED25519(ed25519.utils.randomPrivateKey())
}

export function randomX25519() {
  return secretKeyToX25519(x25519.utils.randomPrivateKey())
}

export function getRandomBytes(bytesLength?: number) {
  return randomBytes(bytesLength)
}
