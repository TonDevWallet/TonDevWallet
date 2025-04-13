import { Address } from '@ton/core'
import type { BlockchainTransaction } from '@ton/sandbox/dist/blockchain/Blockchain'
import { Blockchain } from '@ton/sandbox/dist/blockchain/Blockchain'
import { ParsedInternalWithPayload } from '@truecarry/tlb-abi'
import { AllShardsResponse } from 'ton-lite-client'

export type ParsedTransaction = BlockchainTransaction & {
  parsed?: ParsedInternalWithPayload
  parsedRaw?: any
  parent?: ParsedTransaction | undefined
  children?: ParsedTransaction[]
  shards?: AllShardsResponse
  shard?: string
  delay?: number
  totalDelay?: number
  jettonData?: {
    balance: bigint
    owner?: Address
    jettonAddress?: Address
  }
  hashMismatch?: boolean
}
export type ManagedSendMessageResult = {
  transactions: ParsedTransaction[]
  shards?: AllShardsResponse
}

export class ManagedBlockchain extends Blockchain {}
