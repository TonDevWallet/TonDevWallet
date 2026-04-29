import { useMemo } from 'react'
import { useLiteclient } from '@/store/liteClient'
import { useWalletListState } from '@/store/walletsListState'
import { IWallet, SavedWallet } from '@/types'
import { Key } from '@/types/Key'
import { getWalletFromKey } from '@/utils/wallets'
import {
  buildWalletSearchString,
  WalletFilter,
  WalletGroup,
  WalletManagementItem,
} from './walletDisplay'

function normalizeKey(rawKey: Key): Key {
  return {
    id: rawKey.id,
    name: rawKey.name || `Key ${rawKey.id}`,
    public_key: rawKey.public_key,
    encrypted: rawKey.encrypted,
    sign_type: rawKey.sign_type || 'ton',
    wallets: (rawKey.wallets || []) as SavedWallet[],
  }
}

export function useWalletManagementItems() {
  const walletsList = useWalletListState()
  const liteClient = useLiteclient()

  return useMemo<WalletManagementItem[]>(() => {
    const result: WalletManagementItem[] = []

    for (const rawKey of walletsList.get()) {
      try {
        const key = normalizeKey(rawKey as Key)
        if (!key.public_key || !key.wallets?.length) continue

        for (const walletData of key.wallets) {
          try {
            const wallet = getWalletFromKey(liteClient, key, walletData) as IWallet | undefined
            if (!wallet) continue

            const hasSecret = Boolean(key.encrypted)
            result.push({
              wallet,
              key,
              keyId: key.id,
              keyName: key.name,
              hasSecret,
              searchString: buildWalletSearchString(wallet, key),
            })
          } catch (error) {
            console.error('Error processing wallet for management:', error)
          }
        }
      } catch (error) {
        console.error('Error processing key for wallet management:', error)
      }
    }

    return result
  }, [walletsList, liteClient])
}

export function filterWalletItems(
  items: WalletManagementItem[],
  query: string,
  filter: WalletFilter
) {
  const normalizedQuery = query.trim().toLowerCase()

  return items.filter((item) => {
    if (filter === 'signer' && !item.hasSecret) return false
    if (filter === 'watchOnly' && item.hasSecret) return false
    if (!normalizedQuery) return true
    return item.searchString.includes(normalizedQuery)
  })
}

export function groupWalletItems(items: WalletManagementItem[]) {
  const groups = new Map<number, WalletGroup>()

  for (const item of items) {
    const existing = groups.get(item.keyId)
    if (existing) {
      existing.items.push(item)
    } else {
      groups.set(item.keyId, {
        key: item.key,
        keyId: item.keyId,
        keyName: item.keyName,
        hasSecret: item.hasSecret,
        items: [item],
      })
    }
  }

  return Array.from(groups.values())
}

export function getWalletManagementStats(items: WalletManagementItem[]) {
  return {
    keyCount: new Set(items.map((item) => item.keyId)).size,
    walletCount: items.length,
    signerCount: items.filter((item) => item.hasSecret).length,
    watchOnlyCount: items.filter((item) => !item.hasSecret).length,
  }
}
