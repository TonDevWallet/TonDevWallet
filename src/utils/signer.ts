import { Key } from '@/types/Key'
// eslint-disable-next-line camelcase
import { sha256_sync, sign } from '@ton/crypto'
import { FireblocksSign } from './fireblocks'
import { secretKeyToED25519 } from './ed25519'
import { getNetworkChainId, MAINNET_CHAIN_ID } from '@/types/network'
import { LiteClientState } from '@/store/liteClient'

export async function SignMessage(privateKey: Buffer, message: Buffer, key: Key, chainId?: number) {
  if (key.sign_type === 'ton') {
    if (privateKey.length === 32) {
      const keyPair = secretKeyToED25519(privateKey)
      privateKey = Buffer.concat([keyPair.secretKey, keyPair.publicKey])
    }

    const selectedNetwork = LiteClientState.selectedNetwork.get()
    const resolvedChainId =
      chainId ?? (selectedNetwork ? getNetworkChainId(selectedNetwork) : MAINNET_CHAIN_ID)

    let finalHash = message

    if (resolvedChainId === 662387) {
      const tl = Buffer.alloc(8)
      tl.writeInt32LE(0x71b34ee1)
      tl.writeInt32LE(resolvedChainId, 4)
      const prefix = sha256_sync(tl)

      finalHash = Buffer.concat([prefix, finalHash])
    }

    const signature = sign(finalHash, privateKey)
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
