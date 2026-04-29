import { IWallet } from '@/types'
import { Key } from '@/types/Key'
import { Address } from '@ton/core'

export type WalletFilter = 'all' | 'signer' | 'watchOnly'

export type WalletManagementItem = {
  wallet: IWallet
  key: Key
  keyId: number
  keyName: string
  hasSecret: boolean
  searchString: string
}

export type WalletGroup = {
  key: Key
  keyId: number
  keyName: string
  hasSecret: boolean
  items: WalletManagementItem[]
}

type WalletAddressOptions = {
  bounceable?: boolean
  urlSafe?: boolean
  testOnly?: boolean
}

const optionsMatrix: Record<keyof Required<WalletAddressOptions>, boolean[]> = {
  bounceable: [true, false],
  urlSafe: [true, false],
  testOnly: [true, false],
}

const allAddressOptionPermutations = Object.keys(optionsMatrix).reduce<WalletAddressOptions[]>(
  (acc, key) => {
    const optionKey = key as keyof Required<WalletAddressOptions>
    return acc.flatMap((partial) =>
      optionsMatrix[optionKey].map((value) => ({ ...partial, [optionKey]: value }))
    )
  },
  [{}]
)

export function getWalletDisplayName(wallet: IWallet) {
  return wallet.name?.trim() || `Wallet ${wallet.type}`
}

export function getWalletTypeLabel(wallet: IWallet) {
  return wallet.type.replace(/_/g, ' ')
}

export function getKeyModeLabel(hasSecret: boolean) {
  return hasSecret ? 'Signer' : 'Watch-only'
}

export function getWalletAddress(wallet: IWallet, options: WalletAddressOptions = {}) {
  return wallet.address.toString({ bounceable: true, urlSafe: true, ...options })
}

export function getShortAddress(address: string | undefined, head = 6, tail = 6) {
  if (!address) return '—'
  if (address.length <= head + tail + 1) return address
  return `${address.slice(0, head)}…${address.slice(-tail)}`
}

export function getWalletSubwalletId(wallet: IWallet) {
  const subwalletId = (wallet as IWallet & { subwalletId?: number | bigint }).subwalletId
  return subwalletId === undefined || subwalletId === null ? undefined : subwalletId.toString()
}

export function getWalletMetadata(wallet: IWallet) {
  const metadata = [{ label: 'Workchain', value: String(wallet.workchainId ?? 0) }]

  const subwalletId = getWalletSubwalletId(wallet)
  if (subwalletId) {
    metadata.push({ label: 'Subwallet', value: subwalletId })
  }

  if ('timeout' in wallet) {
    metadata.push({ label: 'Timeout', value: `${wallet.timeout}s` })
  }

  return metadata
}

export function buildWalletSearchString(wallet: IWallet, key: Key) {
  const addressValues = [
    ...allAddressOptionPermutations.map((options) => wallet.address.toString(options)),
    wallet.address.toRawString(),
  ]

  return [
    key.name,
    key.id,
    key.sign_type,
    key.public_key,
    getKeyModeLabel(Boolean(key.encrypted)),
    getWalletDisplayName(wallet),
    wallet.id,
    wallet.type,
    wallet.workchainId ?? 0,
    getWalletSubwalletId(wallet),
    ...addressValues,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function buildExplorerLink(scannerUrl: string | undefined, address: string) {
  const baseUrl = scannerUrl || 'https://tonviewer.com/'
  const addAddressSegment = baseUrl.indexOf('tonviewer.com') === -1
  return `${baseUrl}${addAddressSegment ? 'address/' : ''}${address}`
}

export function getAddressTypeLabel(address: string) {
  try {
    const parsed = Address.parse(address)
    return parsed.workChain === -1 ? 'Masterchain' : 'Basechain'
  } catch {
    return 'Address'
  }
}
