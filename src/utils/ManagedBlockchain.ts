import type { BlockchainTransaction } from '@ton/sandbox/dist/blockchain/Blockchain'
import { Blockchain } from '@ton/sandbox/dist/blockchain/Blockchain'
import { ParsedInternal } from '@truecarry/tlb-abi'
import { AllShardsResponse } from 'ton-lite-client'

export type ParsedTransaction = BlockchainTransaction & {
  parsed?: ParsedInternal
  parent?: ParsedTransaction | undefined
  children?: ParsedTransaction[]
  shards?: AllShardsResponse
  shard?: string
  delay?: number
  totalDelay?: number
}
export type ManagedSendMessageResult = {
  transactions: ParsedTransaction[]
  shards?: AllShardsResponse
}

export class ManagedBlockchain extends Blockchain {}
