import { getDatabase } from '@/db'
import { Key } from '@/types/Key'
import { hookstate, useHookstate } from '@hookstate/core'
import { Knex } from 'knex'
import { getWalletState, setWalletKey } from './walletState'
import { NavigateFunction } from 'react-router-dom'
import { SavedWallet, WalletType } from '@/types'
import { ConnectMessageTransaction, LastSelectedWallets } from '@/types/connect'
import { encryptWalletData, getPasswordInteractive } from './passwordManager'
import { secretKeyToED25519 } from '@/utils/ed25519'

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

  await updateWalletsList()

  return res[0]
}

export async function deleteWallet(db: Knex, key: number) {
  await db.transaction(async (tx) => {
    await tx.raw(`DELETE FROM connect_message_transactions WHERE key_id = ?`, [key])
    await tx.raw(`DELETE FROM connect_sessions WHERE key_id = ?`, [key])
    await tx.raw(`DELETE FROM last_selected_wallets WHERE key_id = ?`, [key])
    await tx.raw(`DELETE FROM wallets WHERE key_id = ?`, [key])
    await tx.raw(`DELETE FROM keys WHERE id = ?`, [key])
  })

  await updateWalletsList()
}

export async function updateWalletName(newName: string, keyId: number) {
  const db = await getDatabase()
  await db<Key>('keys')
    .where({
      id: keyId,
    })
    .update({
      name: newName,
    })
  await updateWalletsList()
}

export async function saveKeyFromData(
  name: string,
  navigate: NavigateFunction,
  seed: Buffer,
  words?: string
) {
  const password = await getPasswordInteractive()

  const encrypted = await encryptWalletData(password, {
    mnemonic: words,
    seed,
  })
  const keyPair = secretKeyToED25519(seed)
  const key: Key = {
    id: 0,
    name: '',
    encrypted,
    public_key: keyPair.publicKey.toString('base64'),
  }

  const db = await getDatabase()
  await saveKeyAndWallets(db, key, name, navigate)
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
      type: 'v5R1',
      key_id: newWallet.id,
      subwallet_id: '2147483409',
      name: 'v5R1',
    },
    // {
    //   type: 'v4R2',
    //   key_id: newWallet.id,
    //   subwallet_id: '698983191',
    //   name: 'v4R2',
    // },
    // {
    //   type: 'v3R2',
    //   key_id: newWallet.id,
    //   subwallet_id: '698983191',
    //   name: 'v3R2',
    // },
    // {
    //   type: 'highload',
    //   key_id: newWallet.id,
    //   subwallet_id: '1',
    //   name: 'Highload V2',
    // },
  ]

  await setWalletKey(newWallet.id)

  const wallets = await db<SavedWallet>('wallets').insert(defaultWallets).returning('*')
  await updateWalletsList()

  const walletState = getWalletState()
  const stateKey = state.find((k) => k.id === walletState.keyId)

  if (stateKey) {
    stateKey.wallets.set(wallets)
  }

  navigate(`/app/wallets/${newWallet?.id}`)
}

export async function CreateNewKeyWallet({
  type,
  subwalletId,
  keyId,
  walletAddress,
  extraData,
  name,
  workchainId,
}: {
  type: WalletType
  subwalletId: bigint
  keyId: number
  walletAddress: string | null
  extraData: string | null
  name?: string | null
  workchainId?: number | null
}) {
  const db = await getDatabase()
  const wallets = await db<SavedWallet>('wallets')
    .insert({
      type,
      key_id: keyId,
      subwallet_id: subwalletId.toString(),
      wallet_address: walletAddress,
      extra_data: extraData,
      name,
      workchain_id: workchainId,
    })
    .returning('*')

  const walletState = getWalletState()
  const stateKey = state.find((k) => k.id.get() === walletState.keyId.get())

  if (stateKey) {
    stateKey.wallets.merge(wallets)
  }

  await updateWalletsList()
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

  await db<LastSelectedWallets>('last_selected_wallets')
    .where({
      wallet_id: walletId,
    })
    .delete()

  await db<SavedWallet>('wallets')
    .where({
      id: walletId,
    })
    .delete()

  await updateWalletsList()
}

export async function UpdateKeyWalletName(walletId: number, name: string) {
  const db = await getDatabase()
  await db<SavedWallet>('wallets')
    .where({
      id: walletId,
    })
    .update({ name })
  await updateWalletsList()
}

export async function savePublicKeyOnly(
  name: string,
  navigate: NavigateFunction,
  publicKey: string
) {
  // Normalize the public key format if needed (assuming base64 is preferred storage format)
  let normalizedPublicKey = publicKey

  // If it's a hex string, convert it to base64
  if (/^[0-9a-fA-F]+$/.test(publicKey) || /^0x[0-9a-fA-F]+$/.test(publicKey)) {
    if (publicKey.startsWith('0x')) {
      normalizedPublicKey = publicKey.slice(2)
    }
    const buffer = Buffer.from(normalizedPublicKey, 'hex')
    normalizedPublicKey = buffer.toString('base64')
  }

  const key: Key = {
    id: 0,
    name: '',
    encrypted: undefined, // No encrypted data for view-only wallet
    public_key: normalizedPublicKey,
  }

  const db = await getDatabase()
  await savePublicKeyAndWallets(db, key, name, navigate)
}

export async function savePublicKeyAndWallets(
  db: Knex,
  key: Key,
  walletName: string,
  navigate: NavigateFunction
) {
  // Check if the public key already exists
  const existing = await db('keys').where('public_key', key.public_key).first()
  if (existing) {
    throw new Error('Public key already exists')
  }

  // Insert the key without requiring encrypted data
  const res = await db.raw<Key>(
    `
    INSERT INTO keys (public_key, name)
    VALUES (?, ?)
    RETURNING *
  `,
    [key.public_key, walletName]
  )

  const newWallet = res[0]
  await updateWalletsList()

  const defaultWallets: Omit<SavedWallet, 'id'>[] = [
    {
      type: 'v5R1',
      key_id: newWallet.id,
      subwallet_id: '2147483409',
      name: 'v5R1',
    },
  ]

  await setWalletKey(newWallet.id)

  const wallets = await db<SavedWallet>('wallets').insert(defaultWallets).returning('*')
  await updateWalletsList()

  const walletState = getWalletState()
  const stateKey = state.find((k) => k.id === walletState.keyId)

  if (stateKey) {
    stateKey.wallets.set(wallets)
  }

  navigate(`/app/wallets/${newWallet?.id}`)
}
