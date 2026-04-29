import type { Address, Cell, Contract, Dictionary, OpenedContract } from '@ton/core'
import type { BlockchainStorage } from '@ton/sandbox/dist/blockchain/BlockchainStorage'
// eslint-disable-next-line camelcase
import type { liteServer_masterchainInfo } from 'ton-lite-client/dist/schema'
import type { LiteClient } from 'ton-lite-client'

/** Liteserver block id passed to account lookups (optional for HTTP backends). */
export type BlockRef = Parameters<LiteClient['getAccountState']>[1]

/**
 * Account snapshot returned by the primary chain client (liteserver and HTTP backends use the same shape for wallet/sandbox code).
 */
export type AccountState = {
  balance: {
    coins: bigint | number
    other?: Record<number, bigint> | Dictionary<number, bigint>
  }
  state?: {
    storage?: {
      state?: {
        type: string
        state?: { data?: Cell; code?: Cell }
      }
    }
  }
}

/** Shard map used when annotating emulated transactions (matches AllShardsResponse-like usage). */
export type ShardsResponse = {
  id: { seqno: number; shard: string; workchain: number }
  shards: { [workchain: string]: { [shard: string]: number } }
}

/** Argument to {@link ApiClient.getAllShardsInfo} (e.g. {@link liteServer_masterchainInfo}.last). */
export type ShardQuery = Parameters<LiteClient['getAllShardsInfo']>[0]

/**
 * Contract-facing chain access used across the app (wallets, TonConnect, emulation, traces).
 * Implemented by liteserver clients and HTTP adapters; not a union of concrete implementations.
 */
export interface ApiClient {
  open<T extends Contract>(contract: T): OpenedContract<T>

  sendMessage(boc: Buffer): Promise<{ status: number }>

  getAccountState(address: Address, blockId?: BlockRef): Promise<AccountState>

  // eslint-disable-next-line camelcase
  getMasterchainInfo(): Promise<liteServer_masterchainInfo>

  getLibraries(hashes: Buffer[]): Promise<{ result: { hash: Buffer; data: Buffer }[] }>

  getAllShardsInfo(block: ShardQuery): Promise<ShardsResponse>

  /** Sandbox {@link BlockchainStorage} for this chain backend (emulation, jetton probes, etc.). */
  createStorageAdapter(): BlockchainStorage
}

/** Subset used by emulation / retracer for TVM library cells. */
export type LibraryClient = Pick<ApiClient, 'getLibraries'>
