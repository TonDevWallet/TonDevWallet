import { type KeyPair } from '@ton/crypto'
import { ed25519, x25519 } from '@noble/curves/ed25519'
import { randomBytes } from '@noble/hashes/utils'
import { cryptoBoxSealOpen } from '@serenity-kit/noble-sodium'
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

/**
 * Decodes a base64 encoded sealed box (created with NaCl box.SealAnonymous)
 * Implements the unsealing process to decrypt the actual data
 * @param base64EncodedBox - Base64 string containing the sealed box
 * @param privateKeyBuffer - The ED25519 private key buffer to decrypt with
 * @returns The decrypted data as a string, or null if decryption fails
 */
export function decodeRequestSource(
  base64EncodedBox: string,
  publicKeyBuffer: Buffer | Uint8Array,
  privateKeyBuffer: Buffer | Uint8Array
): {
  origin: string
  time: string
  client_id: string
  user_agent: string
} | null {
  try {
    // Decode base64 to get the sealed box bytes
    const sealedBoxBytes = Buffer.from(base64EncodedBox, 'base64')

    // NaCl box.SealAnonymous format: [32 bytes ephemeral public key][sealed box with embedded nonce]
    if (sealedBoxBytes.length < 48) {
      console.error('Sealed box too short - must be at least 48 bytes (32 + 16 MAC minimum)')
      return null
    }

    const decryptedBytes = cryptoBoxSealOpen({
      ciphertext: sealedBoxBytes,
      privateKey: privateKeyBuffer,
      publicKey: publicKeyBuffer,
    })

    if (!decryptedBytes) {
      console.error('Failed to decrypt sealed box - authentication failed or wrong key')
      return null
    }

    // Convert decrypted bytes to string
    const decryptedString = Buffer.from(decryptedBytes).toString('utf-8')
    const parsed = JSON.parse(decryptedString)

    return parsed as {
      origin: string
      time: string
      client_id: string
      user_agent: string
    }
  } catch (error) {
    console.error('Error decoding request source:', error)
    return null
  }
}
