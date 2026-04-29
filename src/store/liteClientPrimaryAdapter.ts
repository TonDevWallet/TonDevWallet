import type { Address, Contract, OpenedContract } from '@ton/core'
import { LiteClient } from 'ton-lite-client'
import type { BlockchainStorage } from '@ton/sandbox/dist/blockchain/BlockchainStorage'
import type {
  BlockRef,
  AccountState,
  ApiClient,
  ShardQuery,
  ShardsResponse,
} from './primaryChainClient'
import { LiteClientBlockchainStorage } from '@/utils/liteClientBlockchainStorage'

/**
 * Wraps {@link LiteClient} as {@link ApiClient} (adds `createStorageAdapter` and unified typing).
 */
export class LiteClientPrimaryAdapter implements ApiClient {
  // eslint-disable-next-line no-useless-constructor
  constructor(private readonly inner: LiteClient) {}

  /** Underlying liteserver client (engine, runMethod, etc.). */
  unwrap(): LiteClient {
    return this.inner
  }

  open<T extends Contract>(contract: T): OpenedContract<T> {
    return this.inner.open(contract)
  }

  sendMessage(boc: Buffer): Promise<{ status: number }> {
    return this.inner.sendMessage(boc)
  }

  getAccountState(address: Address, blockId?: BlockRef): Promise<AccountState> {
    return this.inner.getAccountState(address, blockId!) as Promise<AccountState>
  }

  getMasterchainInfo() {
    return this.inner.getMasterchainInfo()
  }

  getLibraries(hashes: Buffer[]) {
    return this.inner.getLibraries(hashes)
  }

  getAllShardsInfo(block: ShardQuery): Promise<ShardsResponse> {
    return this.inner.getAllShardsInfo(block)
  }

  createStorageAdapter(): BlockchainStorage {
    return new LiteClientBlockchainStorage(this)
  }
}
