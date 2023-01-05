import { getDatabase } from '@/db'
import { Key } from '@/types/Key'
import { hookstate, useHookstate } from '@hookstate/core'
import { Knex } from 'knex'

const state = hookstate<Key[]>(() => getWallets())

async function getWallets() {
  const db = await getDatabase()
  const res = await db<Key>('keys')
  return res
}

export async function updateWalletsList() {
  state.set(await getWallets())
}

export function useWalletListState() {
  return useHookstate(state)
}

export async function saveWallet(db: Knex, key: Key, walletName: string) {
  // const key = wallet.key.get()
  if (!key?.seed) {
    return
  }

  await db.raw(`INSERT INTO keys(words,seed,wallet_id,name) VALUES(?,?,?,?)`, [
    key.words,
    key.seed,
    key.wallet_id,
    walletName,
  ])
  updateWalletsList()
}
export async function deleteWallet(db: Knex, key: Key) {
  await db.raw(`DELETE FROM keys WHERE id = ?`, [key?.id])
  updateWalletsList()
}
