import { getDatabase } from '@/db'
import { Key } from '@/types/Key'
import { hookstate, useHookstate } from '@hookstate/core'
import { Knex } from 'knex'
import { getWalletState, setWalletKey } from './walletState'
import { NavigateFunction } from 'react-router-dom'
import { SavedWallet, WalletType } from '@/types'
import { ConnectMessageTransaction } from '@/types/connect'

const state = hookstate<Key[]>(() => getWallets())

async function getWallets() {
  const db = await getDatabase()
  const res = await db<Key>('keys')
  const wallets = await db<SavedWallet>('wallets').select('*')

  for (let i = 0; i < res.length; i++) {
    for (const w of wallets) {
      if (w.key_id === res[i].id) {
        if (res[i].wallets) {
          res[i].wallets?.push(w)
        } else {
          res[i].wallets = [w]
        }
      }
    }
  }

  return res
}

export async function updateWalletsList() {
  state.set(await getWallets())
}

export function useWalletListState() {
  return useHookstate(state)
}

export function getWalletListState() {
  return state
}

export async function saveKey(db: Knex, key: Key, walletName: string): Promise<Key> {
  // const key = wallet.key.get()
  if (!key?.encrypted) {
    throw new Error('no encrypted')
  }

  const existing = await db('keys').where('public_key', key.public_key).first()
  console.log('existing', existing, key.public_key)
  if (existing) {
    throw new Error('Seed exists')
  }

  const res = await db<Key>('keys')
    .insert({
      encrypted: key.encrypted,
      public_key: key.public_key,
      name: walletName,
    })
    .returning('*')

  updateWalletsList()

  return res[0]
}

export async function deleteWallet(db: Knex, key: number) {
  await db.raw(`DELETE FROM keys WHERE id = ?`, [key])
  updateWalletsList()
}

export async function saveKeyAndWallets(
  db: Knex,
  key: Key,
  walletName: string,
  navigate: NavigateFunction
) {
  const newWallet = await saveKey(db, key, walletName)

  const defaultWallets: Omit<SavedWallet, 'id'>[] = [
    {
      type: 'v4R2',
      key_id: newWallet.id,
      subwallet_id: 698983191,
    },
    {
      type: 'v3R2',
      key_id: newWallet.id,
      subwallet_id: 698983191,
    },
    {
      type: 'highload',
      key_id: newWallet.id,
      subwallet_id: 1,
    },
  ]

  setWalletKey(newWallet.id)

  const wallets = await db<SavedWallet>('wallets').insert(defaultWallets).returning('*')

  const walletState = getWalletState()
  const stateKey = state.find((k) => k.id === walletState.keyId)

  if (stateKey) {
    stateKey.wallets.set(wallets)
  }

  navigate(`/wallets/${newWallet?.id}`)
}

export async function CreateNewKeyWallet({
  type,
  subwalletId,
  keyId,
}: {
  type: WalletType
  subwalletId: number
  keyId: number
}) {
  const db = await getDatabase()
  const wallets = await db<SavedWallet>('wallets')
    .insert({
      type,
      key_id: keyId,
      subwallet_id: subwalletId,
    })
    .returning('*')

  const walletState = getWalletState()
  const stateKey = state.find((k) => k.id.get() === walletState.keyId.get())
  console.log('stateKey?', state)

  if (stateKey) {
    console.log('merge', stateKey, wallets)
    stateKey.wallets.merge(wallets)
  }
}

export async function DeleteKeyWallet(walletId: number) {
  const db = await getDatabase()

  const sessionsCount = await db('connect_sessions')
    .where({ wallet_id: walletId })
    .count({ count: '*' })
    .first()
  const transactionsCount = await db<ConnectMessageTransaction>('connect_message_transactions')
    .where({ wallet_id: walletId, status: 0 })
    .count({ count: '*' })
    .first()

  if (sessionsCount?.count || transactionsCount?.count) {
    console.log(sessionsCount, transactionsCount)
    throw new Error('Wallet already used')
  }

  await db<SavedWallet>('wallets')
    .where({
      id: walletId,
    })
    .delete()

  updateWalletsList()
}
