import { Key } from '@/types/Key'
import { sign } from '@ton/crypto'
import { FireblocksSign } from './fireblocks'

export async function SignMessage(privateKey: Buffer, message: Buffer, key: Key) {
  if (key.sign_type === 'ton') {
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
