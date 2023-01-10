import { Key } from '@/types/Key'
import { hookstate, State, useHookstate } from '@hookstate/core'

import { IWallet } from '@/types'

import { keyPairFromSeed } from 'ton-crypto'
import { getWalletListState } from './walletsListState'

interface SelectedKey {
  key: State<Key> | null
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

export function getWalletState() {
  return state
}

export async function setWalletKey(keyId: number /* key: Key */) {
  console.log('setWalletKey', keyId)
  const keyList = getWalletListState()
  const key = keyList.find((key) => key.get().id === keyId)
  console.log('key found?', key)
  if (!key) {
    return
  }

  if (key.seed && !key.keyPair.get()) {
    console.log('seed', key.seed)
    key.merge({
      keyPair: keyPairFromSeed(Buffer.from(key.get().seed || '', 'hex')),
    })
    console.log('key merge', key)
  }
  state.key.set(key)
}

export function setSelectedWallet(v: IWallet | null) {
  state.selectedWallet.set(v)
}
