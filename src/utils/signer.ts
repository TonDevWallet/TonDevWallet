import { Key } from '@/types/Key'
import { sign } from '@ton/crypto'
import { FireblocksSign } from './fireblocks'
import { secretKeyToED25519 } from './ed25519'

export async function SignMessage(privateKey: Buffer, message: Buffer, key: Key) {
  if (key.sign_type === 'ton') {
    if (privateKey.length === 32) {
      const keyPair = secretKeyToED25519(privateKey)
      privateKey = Buffer.concat([keyPair.secretKey, keyPair.publicKey])
    }
    const signature = sign(message, privateKey)
    return new Uint8Array(signature)
  } else if (key.sign_type === 'fireblocks') {
    if (privateKey.length === 64) {
      privateKey = privateKey.subarray(0, 32)
    }
    const signature = await FireblocksSign('0x' + privateKey.toString('hex'), message)
    return signature
  }
  throw new Error('Unknown sign type')
}
