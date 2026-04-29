/* eslint-disable camelcase */
import { Address, Dictionary } from '@ton/core'
import { Blockchain } from '@ton/sandbox'
import { BlockchainStorage } from '@ton/sandbox/dist/blockchain/BlockchainStorage'
import { SmartContract } from '@ton/sandbox/dist/blockchain/SmartContract'
import { extractEc } from '@ton/sandbox/dist/utils/ec'
import type { ApiClient } from '@/store/primaryChainClient'
// eslint-disable-next-line camelcase
import { liteServer_masterchainInfo } from 'ton-lite-client/dist/schema'

export class LiteClientBlockchainStorage implements BlockchainStorage {
  private contracts: Map<string, SmartContract> = new Map()
  private client: ApiClient

  constructor(client: ApiClient) {
    this.client = client
  }

  async getContract(blockchain: Blockchain, address: Address) {
    let existing = this.contracts.get(address.toString())
    if (!existing) {
      const lastBlock = await getLastLiteBlock(this.client)
      const account = await this.client.getAccountState(address, lastBlock.last)
      const accState = account.state?.storage?.state
      const statePayload = accState?.state

      if (accState?.type !== 'active' || !statePayload?.data || !statePayload?.code) {
        existing = SmartContract.empty(blockchain, address)
        existing.balance = BigInt(account.balance.coins)
        if (account.balance.other) {
          existing.ec =
            account.balance.other instanceof Dictionary
              ? extractEc(account.balance.other)
              : account.balance.other
        }
      } else {
        existing = SmartContract.create(blockchain, {
          address,
          data: statePayload.data,
          code: statePayload.code,
          balance: BigInt(account.balance.coins),
        })
        if (account.balance.other) {
          existing.ec =
            account.balance.other instanceof Dictionary
              ? extractEc(account.balance.other)
              : account.balance.other
        }
      }

      this.contracts.set(address.toString(), existing)
    }

    return existing
  }

  knownContracts() {
    return [...this.contracts.values()]
  }

  clearKnownContracts() {
    this.contracts = new Map()
  }
}

// let cachedMaterInfo: { info?: liteServer_masterchainInfo; ts?: number } = {}
export async function getLastLiteBlock(
  lc: Pick<ApiClient, 'getMasterchainInfo'>
): Promise<liteServer_masterchainInfo> {
  const info = await lc.getMasterchainInfo()
  // if (cachedMaterInfo.info && cachedMaterInfo?.info?.last?.seqno > info.last.seqno) {
  //   return cachedMaterInfo.info
  // }

  // cachedMaterInfo = {
  //   info,
  //   ts: Date.now(),
  // }

  return info
}
