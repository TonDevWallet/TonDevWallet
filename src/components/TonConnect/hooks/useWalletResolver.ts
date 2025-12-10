import { getWalletListState } from '@/store/walletsListState'
import { getWalletFromKey } from '@/utils/wallets'
import { LiteClient } from 'ton-lite-client'
import { Key } from '@/types/Key'
import { SavedWallet } from '@/types'

export interface WalletMeta {
  keyId: number | undefined
  walletId: number | undefined
  walletAddress: string | undefined
}

/**
 * Resolves wallet metadata (keyId, walletId, walletAddress) from a raw wallet address.
 * First checks saved wallet_address, then derives address from wallet contract.
 */
export function resolveWalletMeta(
  walletAddress: string | undefined,
  liteClient: LiteClient | undefined
): WalletMeta {
  if (!walletAddress) {
    return { keyId: undefined, walletId: undefined, walletAddress: undefined }
  }

  const keysState = getWalletListState()
  const keys = keysState.get({ noproxy: true }) || []

  for (const key of keys) {
    const wallets = key.wallets || []
    for (const wallet of wallets) {
      // Check saved address first
      if (wallet.wallet_address && wallet.wallet_address === walletAddress) {
        return { keyId: key.id, walletId: wallet.id, walletAddress }
      }
      // Derive address from wallet contract
      if (liteClient) {
        const tonWallet = getWalletFromKey(liteClient, key, wallet)
        if (tonWallet?.address.toRawString() === walletAddress) {
          return { keyId: key.id, walletId: wallet.id, walletAddress }
        }
      }
    }
  }

  return { keyId: undefined, walletId: undefined, walletAddress }
}

/**
 * Resolves wallet address from session keyId/walletId.
 */
export function resolveWalletAddressFromSession(
  keyId: number,
  walletId: number,
  liteClient: LiteClient
): string | undefined {
  const keysState = getWalletListState()
  const keys = keysState.get({ noproxy: true }) || []

  const key = keys.find((k) => k.id === keyId)
  if (!key) return undefined

  const wallet = key.wallets?.find((w) => w.id === walletId)
  if (!wallet) return undefined

  const tonWallet = getWalletFromKey(liteClient, key, wallet)
  return tonWallet?.address.toRawString()
}

/**
 * Finds key and wallet objects by their IDs.
 */
export function findKeyAndWallet(
  keyId: number,
  walletId: number
): { key: Key; wallet: SavedWallet } | undefined {
  const keysState = getWalletListState()
  const keys = keysState.get({ noproxy: true }) || []

  const keyData = keys.find((k) => k.id === keyId)
  if (!keyData) return undefined

  const wallet = keyData.wallets?.find((w) => w.id === walletId)
  if (!wallet) return undefined

  // Convert to mutable Key type
  const key: Key = {
    id: keyData.id,
    encrypted: keyData.encrypted,
    public_key: keyData.public_key,
    name: keyData.name,
    sign_type: keyData.sign_type,
    wallets: keyData.wallets ? [...keyData.wallets] : undefined,
    encryptedData: keyData.encryptedData,
  }

  return { key, wallet }
}
