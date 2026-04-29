/**
 * BlockchainStorage for TonCenter primary mode (stub adapter until v3 client is implemented).
 */
import { Address, Dictionary } from '@ton/core'
import { extractEc } from '@ton/sandbox/dist/utils/ec'
import { Blockchain } from '@ton/sandbox'
import { BlockchainStorage } from '@ton/sandbox/dist/blockchain/BlockchainStorage'
import { SmartContract } from '@ton/sandbox/dist/blockchain/SmartContract'
import type { ApiClient } from '@/store/primaryChainClient'

export class ToncenterBlockchainStorage implements BlockchainStorage {
  private contracts: Map<string, SmartContract> = new Map()
  private client: ApiClient

  constructor(client: ApiClient) {
    this.client = client
  }

  async getContract(blockchain: Blockchain, address: Address) {
    let existing = this.contracts.get(address.toString())
    if (!existing) {
      const accountState = await this.client.getAccountState(address)

      const stateData = accountState.state?.storage?.state?.state
      if (
        accountState.state?.storage?.state?.type !== 'active' ||
        !stateData?.data ||
        !stateData?.code
      ) {
        existing = SmartContract.empty(blockchain, address)
        existing.balance = BigInt(accountState.balance.coins)
        if (accountState.balance.other) {
          existing.ec =
            accountState.balance.other instanceof Dictionary
              ? extractEc(accountState.balance.other)
              : accountState.balance.other
        }
      } else {
        existing = SmartContract.create(blockchain, {
          address,
          data: stateData.data,
          code: stateData.code,
          balance: BigInt(accountState.balance.coins),
        })
        if (accountState.balance.other) {
          existing.ec =
            accountState.balance.other instanceof Dictionary
              ? extractEc(accountState.balance.other)
              : accountState.balance.other
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
    this.contracts.clear()
  }
}
