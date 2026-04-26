import { type AppDatabase, getDatabase } from '@/db'
import { Key } from '@/types/Key'
import { hookstate, useHookstate } from '@hookstate/core'
import { getWalletState, setWalletKey } from './walletState'
import { NavigateFunction } from 'react-router-dom'
import { IWallet, SavedWallet, WalletType } from '@/types'
import { encryptWalletData, getPasswordInteractive } from './passwordManager'
import { secretKeyToED25519 } from '@/utils/ed25519'

function getDefaultWalletsToSave(
  newWalletId: number,
  walletsToSave?: IWallet[]
): Omit<SavedWallet, 'id'>[] {
  const defaultWallets: Omit<SavedWallet, 'id'>[] =
    walletsToSave && walletsToSave.length > 0
      ? walletsToSave.map((w) => ({
          type: w.type,
          key_id: newWalletId,
          subwallet_id: ((w as any)?.subwalletId || 0).toString(),
          name: w.type,
        }))
      : [
          {
            type: 'v5R1',
            key_id: newWalletId,
            subwallet_id: '2147483409',
            name: 'v5R1',
          },
        ]

  return defaultWallets
}

async function insertSavedWallets(
  db: AppDatabase,
  wallets: Omit<SavedWallet, 'id'>[]
): Promise<SavedWallet[]> {
  if (wallets.length === 0) {
    return []
  }

  const values = wallets.flatMap((wallet) => [
    wallet.type,
    wallet.key_id,
    wallet.subwallet_id,
    wallet.wallet_address ?? null,
    wallet.extra_data ?? null,
    wallet.name ?? null,
    wallet.workchain_id ?? null,
  ])
  const placeholders = wallets.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')

  return db.select<SavedWallet>(
    `
      INSERT INTO wallets (
        type,
        key_id,
        subwallet_id,
        wallet_address,
        extra_data,
        name,
        workchain_id
      )
      VALUES ${placeholders}
      RETURNING *
    `,
    values
  )
}

const state = hookstate<Key[]>(() => getWallets())

export async function getWallets() {
  const db = await getDatabase()
  const res = await db.select<Key>('SELECT * FROM keys')
  const wallets = await db.select<SavedWallet>('SELECT * FROM wallets')

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

export async function saveKey(db: AppDatabase, key: Key, walletName: string): Promise<Key> {
  // const key = wallet.key.get()
  if (!key?.encrypted) {
    throw new Error('no encrypted')
  }

  const existing = await db.first<Key>('SELECT * FROM keys WHERE public_key = ?', [key.public_key])
  console.log('existing', existing, key.public_key)
  if (existing) {
    throw new Error('Seed exists')
  }

  const res = await db.select<Key>(
    `
      INSERT INTO keys (encrypted, public_key, name, sign_type)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `,
    [key.encrypted, key.public_key, walletName, key.sign_type || 'ton']
  )

  await updateWalletsList()

  return res[0]
}

export async function deleteWallet(db: AppDatabase, key: number) {
  await db.executeTransaction([
    { sql: `DELETE FROM connect_message_transactions WHERE key_id = ?`, bindings: [key] },
    { sql: `DELETE FROM connect_sessions WHERE key_id = ?`, bindings: [key] },
    { sql: `DELETE FROM last_selected_wallets WHERE key_id = ?`, bindings: [key] },
    { sql: `DELETE FROM wallets WHERE key_id = ?`, bindings: [key] },
    { sql: `DELETE FROM keys WHERE id = ?`, bindings: [key] },
  ])

  await updateWalletsList()
}

export async function updateWalletName(newName: string, keyId: number) {
  const db = await getDatabase()
  await db.execute('UPDATE keys SET name = ? WHERE id = ?', [newName, keyId])
  await updateWalletsList()
}

export async function saveKeyFromData(
  name: string,
  navigate: NavigateFunction,
  seed: Buffer,
  publicKey?: Buffer,
  words?: string,
  wallets?: IWallet[],
  signType: 'ton' | 'fireblocks' = 'ton'
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
    public_key: publicKey ? publicKey.toString('base64') : keyPair.publicKey.toString('base64'),
    sign_type: signType,
  }

  const db = await getDatabase()
  await saveKeyAndWallets(db, key, name, navigate, wallets)
}
export async function saveKeyAndWallets(
  db: AppDatabase,
  key: Key,
  walletName: string,
  navigate: NavigateFunction,
  walletsToSave?: IWallet[]
) {
  if (!key?.encrypted) {
    throw new Error('no encrypted')
  }

  const existing = await db.first<Key>('SELECT * FROM keys WHERE public_key = ?', [key.public_key])
  console.log('existing', existing, key.public_key)
  if (existing) {
    throw new Error('Seed exists')
  }

  const defaultWallets = getDefaultWalletsToSave(0, walletsToSave)
  const walletPlaceholders = defaultWallets
    .map(() => '(?, last_insert_rowid(), ?, ?, ?, ?, ?)')
    .join(', ')
  const walletValues = defaultWallets.flatMap((wallet) => [
    wallet.type,
    wallet.subwallet_id,
    wallet.wallet_address ?? null,
    wallet.extra_data ?? null,
    wallet.name ?? null,
    wallet.workchain_id ?? null,
  ])

  const transactionResult = await db.executeTransaction<Key | SavedWallet>([
    {
      sql: `
        INSERT INTO keys (encrypted, public_key, name, sign_type)
        VALUES (?, ?, ?, ?)
        RETURNING *
      `,
      bindings: [key.encrypted, key.public_key, walletName, key.sign_type || 'ton'],
      returnRows: true,
    },
    {
      sql: `
        INSERT INTO wallets (
          type,
          key_id,
          subwallet_id,
          wallet_address,
          extra_data,
          name,
          workchain_id
        )
        VALUES ${walletPlaceholders}
        RETURNING *
      `,
      bindings: walletValues,
      returnRows: true,
    },
  ])

  const newWallet = transactionResult[0][0] as Key
  const wallets = transactionResult[1] as SavedWallet[]

  await updateWalletsList()
  await setWalletKey(newWallet.id)

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
  const wallets = await db.select<SavedWallet>(
    `
      INSERT INTO wallets (
        type,
        key_id,
        subwallet_id,
        wallet_address,
        extra_data,
        name,
        workchain_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `,
    [
      type,
      keyId,
      subwalletId.toString(),
      walletAddress,
      extraData,
      name ?? null,
      workchainId ?? null,
    ]
  )

  const walletState = getWalletState()
  const stateKey = state.find((k) => k.id.get() === walletState.keyId.get())

  if (stateKey) {
    stateKey.wallets.merge(wallets)
  }

  await updateWalletsList()
}

export async function DeleteKeyWallet(walletId: number) {
  const db = await getDatabase()

  const sessionsCount = await db.first<{ count: number }>(
    'SELECT COUNT(*) AS count FROM connect_sessions WHERE wallet_id = ?',
    [walletId]
  )
  const transactionsCount = await db.first<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM connect_message_transactions
      WHERE wallet_id = ? AND status = 0
    `,
    [walletId]
  )

  if (Number(sessionsCount?.count ?? 0) > 0 || Number(transactionsCount?.count ?? 0) > 0) {
    console.log(sessionsCount, transactionsCount)
    throw new Error('Wallet already used')
  }

  await db.execute('DELETE FROM last_selected_wallets WHERE wallet_id = ?', [walletId])
  await db.execute('DELETE FROM wallets WHERE id = ?', [walletId])

  await updateWalletsList()
}

export async function UpdateKeyWalletName(walletId: number, name: string) {
  const db = await getDatabase()
  await db.execute('UPDATE wallets SET name = ? WHERE id = ?', [name, walletId])
  await updateWalletsList()
}

export async function savePublicKeyOnly(
  name: string,
  navigate: NavigateFunction,
  publicKey: Buffer,
  walletsToSave?: IWallet[]
) {
  // Normalize the public key format if needed (assuming base64 is preferred storage format)
  const normalizedPublicKey = publicKey

  // If it's a hex string, convert it to base64
  // if (/^[0-9a-fA-F]+$/.test(publicKey) || /^0x[0-9a-fA-F]+$/.test(publicKey)) {
  //   if (publicKey.startsWith('0x')) {
  //     normalizedPublicKey = publicKey.slice(2)
  //   }
  //   const buffer = Buffer.from(normalizedPublicKey, 'hex')
  //   normalizedPublicKey = buffer.toString('base64')
  // }

  const key: Key = {
    id: 0,
    name: '',
    encrypted: undefined, // No encrypted data for view-only wallet
    public_key: normalizedPublicKey.toString('base64'),
    sign_type: 'ton',
  }

  const db = await getDatabase()
  await savePublicKeyAndWallets(db, key, name, navigate, walletsToSave)
}

export async function savePublicKeyAndWallets(
  db: AppDatabase,
  key: Key,
  walletName: string,
  navigate: NavigateFunction,
  walletsToSave?: IWallet[]
) {
  // Check if the public key already exists
  const existing = await db.first<Key>('SELECT * FROM keys WHERE public_key = ?', [key.public_key])
  if (existing) {
    throw new Error('Public key already exists')
  }

  // Insert the key without requiring encrypted data
  const res = await db.select<Key>(
    `
      INSERT INTO keys (public_key, name, sign_type)
      VALUES (?, ?, ?)
      RETURNING *
    `,
    [key.public_key, walletName, key.sign_type || 'ton']
  )

  const newWallet = res[0]
  await updateWalletsList()

  const defaultWallets = getDefaultWalletsToSave(newWallet.id, walletsToSave)

  await setWalletKey(newWallet.id)

  const wallets = await insertSavedWallets(db, defaultWallets)
  await updateWalletsList()

  const walletState = getWalletState()
  const stateKey = state.find((k) => k.id === walletState.keyId)

  if (stateKey) {
    stateKey.wallets.set(wallets)
  }

  navigate(`/app/wallets/${newWallet?.id}`)
}
