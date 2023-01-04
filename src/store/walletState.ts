import { Key } from '@/types/Key'
import { hookstate, useHookstate } from '@hookstate/core'

import { IWallet } from '@/types'

import { keyPairFromSeed, mnemonicNew, mnemonicToSeed, mnemonicToPrivateKey } from 'ton-crypto'

interface SelectedKey {
  key: Key | null
  selectedWallet: IWallet | null
}

const state = hookstate<SelectedKey>(async () => {
  const mnemonic = await mnemonicNew(24)
  // https://github.com/toncenter/tonweb-mnemonic/blob/2459698f4bf639efffb05f3508bd29c6161946c6/src/functions/mnemonic-to-seed.ts
  const seed = await (await mnemonicToSeed(mnemonic, 'TON default seed')).slice(0, 32)
  const keyPair = await mnemonicToPrivateKey(mnemonic)

  return {
    key: {
      id: 0,
      words: mnemonic.join(' '),
      seed: seed.toString('hex'),
      wallet_id: 0,
      name: '',
      keyPair,
    },
    selectedWallet: null,
  }
})

export function useWallet() {
  return useHookstate(state)
}

export async function setWalletKey(key: Key) {
  if (key.seed && !key.keyPair) {
    console.log('seed', key.seed)
    key.keyPair = keyPairFromSeed(Buffer.from(key.seed, 'hex'))
  }
  state.key.set(key)
}

export function setSelectedWallet(v: IWallet | null) {
  state.selectedWallet.set(v)
}
