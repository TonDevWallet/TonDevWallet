import { Buffer } from 'buffer'
import { hookstate, useHookstate } from '@hookstate/core'
import type { NavigateFunction } from 'react-router-dom'
import type { Key } from '@/types/Key'
import type { IWallet, SavedWallet, WalletType } from '@/types'

const signerPublicKey = Buffer.alloc(32, 1).toString('base64')
const watchPublicKey = Buffer.alloc(32, 2).toString('base64')

const signerWallets: SavedWallet[] = [
  {
    id: 101,
    key_id: 1,
    type: 'v5R1',
    subwallet_id: '2147483409',
    wallet_address: null,
    extra_data: null,
    name: 'Everyday v5',
    workchain_id: 0,
  },
  {
    id: 102,
    key_id: 1,
    type: 'v4R2',
    subwallet_id: '698983191',
    wallet_address: null,
    extra_data: null,
    name: 'Legacy v4',
    workchain_id: 0,
  },
]

const watchWallets: SavedWallet[] = [
  {
    id: 201,
    key_id: 2,
    type: 'v5R1',
    subwallet_id: '2147483409',
    wallet_address: null,
    extra_data: null,
    name: 'Treasury watch-only',
    workchain_id: 0,
  },
]

export const storybookKeys: Key[] = [
  {
    id: 1,
    name: 'Primary signer',
    encrypted: JSON.stringify({ cypher: 'encrypted-scrypt-tweetnacl', salt: 'storybook', N: 1, r: 1, p: 1 }),
    public_key: signerPublicKey,
    sign_type: 'ton',
    wallets: signerWallets,
  },
  {
    id: 2,
    name: 'Watch-only treasury',
    encrypted: null,
    public_key: watchPublicKey,
    sign_type: 'ton',
    wallets: watchWallets,
  },
]

const state = hookstate<Key[]>(storybookKeys)

export async function getWallets() {
  return state.get({ noproxy: true }) as Key[]
}

export async function updateWalletsList() {
  state.set([...(state.get({ noproxy: true }) as Key[])])
}

export function useWalletListState() {
  return useHookstate(state)
}

export function getWalletListState() {
  return state
}

export function setStorybookWallets(keys: Key[]) {
  state.set(keys)
}

export async function saveKey(_db: unknown, key: Key, walletName: string): Promise<Key> {
  const saved = { ...key, id: Date.now(), name: walletName }
  state.merge([saved])
  return saved
}

export async function deleteWallet(_db: unknown, key: number) {
  state.set((state.get({ noproxy: true }) as Key[]).filter((item) => item.id !== key))
}

export async function updateWalletName(newName: string, keyId: number) {
  const key = state.find((item) => item.id.get() === keyId)
  key?.name.set(newName)
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
  console.debug('[storybook saveKeyFromData]', { name, seed, publicKey, words, wallets, signType })
  navigate('/app/wallets_list')
}

export async function saveKeyAndWallets(
  _db: unknown,
  key: Key,
  walletName: string,
  navigate: NavigateFunction
) {
  await saveKey(null, key, walletName)
  navigate('/app/wallets_list')
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
  const key = state.find((item) => item.id.get() === keyId) ?? state[0]
  key.wallets.merge([
    {
      id: Date.now(),
      key_id: key.id.get(),
      type,
      subwallet_id: subwalletId.toString(),
      wallet_address: walletAddress,
      extra_data: extraData,
      name,
      workchain_id: workchainId,
    },
  ])
}

export async function DeleteKeyWallet(walletId: number) {
  state.forEach((key) => {
    key.wallets.set((key.wallets.get({ noproxy: true }) ?? []).filter((wallet) => wallet.id !== walletId))
  })
}

export async function UpdateKeyWalletName(walletId: number, name: string) {
  state.forEach((key) => {
    const wallet = key.wallets.find((item) => item.id.get() === walletId)
    wallet?.name.set(name)
  })
}

export async function savePublicKeyOnly(
  name: string,
  navigate: NavigateFunction,
  publicKey: Buffer,
  walletsToSave?: IWallet[]
) {
  console.debug('[storybook savePublicKeyOnly]', { name, publicKey, walletsToSave })
  navigate('/app/wallets_list')
}

export async function savePublicKeyAndWallets(
  _db: unknown,
  key: Key,
  walletName: string,
  navigate: NavigateFunction
) {
  await saveKey(null, { ...key, encrypted: null }, walletName)
  navigate('/app/wallets_list')
}
