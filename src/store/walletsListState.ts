import { getDatabase } from '@/db'
import { Key } from '@/types/Key'
import { hookstate, useHookstate } from '@hookstate/core'

const state = hookstate<Key[]>(() => getWallets())

async function getWallets() {
  const db = await getDatabase()
  const res = await db.select<Key[]>(`SELECT * FROM keys`)
  return res
}

export async function updateWalletsList() {
  state.set(await getWallets())
}

export function useWalletListState() {
  return useHookstate(state)
}
