import { hookstate } from '@hookstate/core'

import { IWallet } from '@/types'

import { keyPairFromSeed } from 'ton-crypto'
import { getWalletListState } from './walletsListState'
import { useMemo } from 'react'

interface SelectedKey {
  keyId: number // number State<Key> | null
  selectedWalletId: number
  // selectedWallet: IWallet | null
}

const state = hookstate<SelectedKey>(() => {
  return {
    keyId: 0,
    selectedWalletId: 0,
  }
})

export function useSelectedKey() {
  const walletsList = getWalletListState()

  return useMemo(() => walletsList.find((k) => k.id.get() === state.keyId.get()), [state.keyId])
}

export function useSelectedWallet() {
  const key = useSelectedKey()

  return useMemo(
    () => key?.wallets.get()?.find((w) => w.id === state.selectedWalletId.get()),
    [state.selectedWalletId, key]
  )
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
  state.keyId.set(key.id.get())
}

export function setSelectedWallet(v: IWallet | null) {
  state.selectedWalletId.set(v?.id || 0)
}
