import { getDatabase } from '@/db'
import { Key } from '@/types/Key'
import { hookstate, useHookstate } from '@hookstate/core'
import Database from 'tauri-plugin-sql-api'

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

export async function saveWallet(db: Database, key: Key, walletName: string) {
  // const key = wallet.key.get()
  if (!key?.seed) {
    return
  }

  await db.execute(`INSERT INTO keys(words,seed,wallet_id,name) VALUES($1,$2,$3,$4)`, [
    key.words,
    key.seed,
    key.wallet_id,
    walletName,
  ])
  updateWalletsList()
}
export async function deleteWallet(db: Database, key: Key) {
  await db.execute(`DELETE FROM keys WHERE id = $1`, [key?.id])
  updateWalletsList()
}
