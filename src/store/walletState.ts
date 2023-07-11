import { hookstate, useHookstate } from '@hookstate/core'

import { IWallet } from '@/types'

import { getWalletListState, useWalletListState } from './walletsListState'
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
  const s = useHookstate(state)
  const walletsList = useWalletListState()

  return useMemo(() => {
    const wallet = walletsList.find((k) => k.id.get() === s.keyId.get())
    return wallet
  }, [s.keyId, walletsList])
}

export function useSelectedWallet() {
  const key = useSelectedKey()
  const s = useHookstate(state)

  return useMemo(() => {
    return key?.wallets.get()?.find((w) => w.id === state.selectedWalletId.get())
  }, [s.selectedWalletId, key])
}

export function getWalletState() {
  return state
}

export async function setWalletKey(keyId: number /* key: Key */) {
  const keyList = getWalletListState()
  const key = keyList.find((key) => key.get().id === keyId)
  if (!key) {
    return
  }

  // if (key.seed && !key.keyPair.get()) {
  //   key.merge({
  //     keyPair: keyPairFromSeed(Buffer.from(key.get().seed || '', 'hex')),
  //   })
  // }
  state.keyId.set(key.id.get())
}

export function setSelectedWallet(v: IWallet | null | undefined | number) {
  if (typeof v === 'number') {
    state.selectedWalletId.set(v)
  } else {
    state.selectedWalletId.set(v?.id || 0)
  }
}
