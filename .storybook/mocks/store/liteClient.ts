import { hookstate, useHookstate } from '@hookstate/core'
import type { BlockchainSource, Network } from '@/types/network'

export type BlockRef = { workchain: number; shard: string; seqno: number }
export type AccountState = Record<string, unknown>
export type LibraryClient = Record<string, unknown>
export type ShardQuery = Record<string, unknown>
export type ShardsResponse = Record<string, unknown>

export interface ApiClient {
  open<T extends Record<string, any>>(contract: T): T & Record<string, any>
  getLastBlock?: () => Promise<BlockRef>
  getAccountState?: () => Promise<AccountState>
  runMethod?: (...args: unknown[]) => Promise<{ exitCode: number; result: string }>
  getMasterchainInfo?: () => Promise<{ last: BlockRef }>
}

export class LiteClientPrimaryAdapter {}

const selectedNetwork: Network = {
  id: 1,
  network_id: 1,
  name: 'Mainnet',
  url: 'https://ton-blockchain.github.io/global.config.json',
  item_order: 0,
  is_default: true,
  is_testnet: false,
  scanner_url: 'https://tonviewer.com/',
  toncenter3_url: 'https://toncenter.com/api/v3/',
  lite_engine_host_mode: 'auto',
  lite_engine_host_custom: '',
  blockchain_source: 'tonapi',
  tonapi_url: 'https://tonapi.io',
  tonapi_token: '',
  toncenter_token: '',
  created_at: new Date(),
  updated_at: new Date(),
}

const mockClient: ApiClient = {
  open<T extends Record<string, any>>(contract: T) {
    return {
      ...contract,
      getSeqno: async () => 0,
      getWalletId: async () => 2147483409n,
      getBalance: async () => 123_456_789n,
      getMultisigData: async () => ({ signers: [], proposers: [], nextOrderSeqno: 1n }),
    }
  },
  getLastBlock: async () => ({ workchain: -1, shard: '-9223372036854775808', seqno: 123456 }),
  getAccountState: async () => ({ balance: { coins: 123_456_789n } }),
  getMasterchainInfo: async () => ({ last: { workchain: -1, shard: '-9223372036854775808', seqno: 123456 } }),
  runMethod: async () => ({ exitCode: 1, result: '' }),
}

const tonapiClient = {
  accounts: {
    getAccountJettonsBalances: async () => ({
      balances: [
        {
          balance: '42000000000',
          wallet_address: { address: 'EQStorybookJettonWallet' },
          jetton: {
            address: 'EQStorybookJetton',
            name: 'Storybook Token',
            symbol: 'STORY',
            decimals: 9,
            image: '',
            verification: 'whitelist',
          },
          price: { prices: { USD: 0.42 } },
        },
      ],
    }),
    getAccountNftItems: async () => ({
      nft_items: [
        {
          address: 'EQStorybookNft',
          index: 1,
          collection: { address: 'EQStorybookCollection', name: 'Storybook Collection' },
          metadata: { name: 'Debug NFT', description: 'Rendered without Tauri' },
        },
      ],
    }),
  },
  dns: {
    dnsResolve: async () => ({ wallet: { address: 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ' } }),
  },
}

export const LiteClientState = hookstate({
  liteClient: mockClient,
  tonapiAdapter: null,
  toncenterAdapter: null,
  networks: [selectedNetwork],
  selectedNetwork,
  tonapiClient,
})

export function useLiteclient(): ApiClient {
  return mockClient
}

export function useApiClient(): ApiClient {
  return mockClient
}

export function useLiteClientRequired(): any {
  return mockClient
}

export function getApiClient(): ApiClient {
  return mockClient
}

export function useBlockchainSource(): BlockchainSource {
  return 'tonapi'
}

export function useIsLiteClientMode(): boolean {
  return false
}

export function useTonapiOnly(): boolean {
  return true
}

export function useTonapiClient() {
  return tonapiClient
}

export function useLiteclientState() {
  return useHookstate(LiteClientState)
}

export async function updateNetworksList() {}

export async function changeLiteClient(networkId: number) {
  const network = LiteClientState.networks.get({ noproxy: true }).find((item) => item.network_id === networkId)
  if (network) {
    LiteClientState.selectedNetwork.set(network)
  }
  return mockClient
}

export async function refreshBlockchainHttpClients() {}
export async function updateTonapiClient() {}

export function getNetworkSourceDbFields(network: Pick<Network, 'blockchain_source'>) {
  return { blockchain_source: network.blockchain_source || 'tonapi' }
}

export function getLiteClient() {
  return mockClient
}
