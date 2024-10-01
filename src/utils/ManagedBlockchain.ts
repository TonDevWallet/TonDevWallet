import type { BlockchainTransaction } from '@ton/sandbox/dist/blockchain/Blockchain'
import { Blockchain } from '@ton/sandbox/dist/blockchain/Blockchain'
import { ParsedInternal } from '@truecarry/tlb-abi'

export type ParsedTransaction = BlockchainTransaction & {
  parsed?: ParsedInternal
  parent?: ParsedTransaction | undefined
  children?: ParsedTransaction[]
}
export type ManagedSendMessageResult = {
  transactions: ParsedTransaction[]
}

export class ManagedBlockchain extends Blockchain {}
