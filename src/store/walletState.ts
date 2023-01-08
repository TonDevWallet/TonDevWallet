import { Key } from '@/types/Key'
import { hookstate, useHookstate } from '@hookstate/core'

import { IWallet } from '@/types'

import { keyPairFromSeed } from 'ton-crypto'

interface SelectedKey {
  key: Key | null
  selectedWallet: IWallet | null
}

const state = hookstate<SelectedKey>(async () => {
  return {
    key: null,
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
