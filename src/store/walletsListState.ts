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
    throw new Error('no seed')
  }

  const existing = await db('keys').where('seed', key.seed).first()
  console.log('existing', existing, key.seed)
  if (existing) {
    throw new Error('Seed exists')
  }

  const res = await db.raw<Key[]>(
    `INSERT INTO keys(words,seed,wallet_id,name) VALUES(?,?,?,?) RETURNING *`,
    [key.words, key.seed, key.wallet_id, walletName]
  )
  console.log('insert res', res)
  updateWalletsList()

  return res[0]
}
export async function deleteWallet(db: Knex, key: Key) {
  await db.raw(`DELETE FROM keys WHERE id = ?`, [key?.id])
  updateWalletsList()
}
