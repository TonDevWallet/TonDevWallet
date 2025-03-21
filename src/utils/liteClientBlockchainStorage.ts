/* eslint-disable camelcase */
import { Address } from '@ton/core'
import { Blockchain } from '@ton/sandbox'
import { BlockchainStorage } from '@ton/sandbox/dist/blockchain/BlockchainStorage'
import { SmartContract } from '@ton/sandbox/dist/blockchain/SmartContract'
import { extractEc } from '@ton/sandbox/dist/utils/ec'
import { LiteClient } from 'ton-lite-client'
// eslint-disable-next-line camelcase
import { liteServer_masterchainInfo } from 'ton-lite-client/dist/schema'

export class LiteClientBlockchainStorage implements BlockchainStorage {
  private contracts: Map<string, SmartContract> = new Map()
  private client: LiteClient

  constructor(client: LiteClient) {
    this.client = client
  }

  async getContract(blockchain: Blockchain, address: Address) {
    let existing = this.contracts.get(address.toString())
    if (!existing) {
      const lastBlock = await getLastLiteBlock(this.client)
      const account = await this.client.getAccountState(address, lastBlock.last)

      if (
        account.state?.storage?.state?.type !== 'active' ||
        !account.state.storage.state.state.data ||
        !account.state.storage.state.state.code
      ) {
        existing = SmartContract.empty(blockchain, address)
        existing.balance = BigInt(account.balance.coins)
        if (account.balance.other) {
          existing.ec = extractEc(account.balance.other)
        }
      } else {
        existing = SmartContract.create(blockchain, {
          address,
          data: account.state.storage.state.state.data,
          code: account.state.storage.state.state.code,
          balance: BigInt(account.balance.coins),
        })
        if (account.balance.other) {
          existing.ec = extractEc(account.balance.other)
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
export async function getLastLiteBlock(lc: LiteClient): Promise<liteServer_masterchainInfo> {
  // if (cachedMaterInfo.info && Date.now() - (cachedMaterInfo.ts || 0) < 1000) {
  //   return cachedMaterInfo.info
  // }

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
