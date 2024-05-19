import type { BlockchainTransaction } from '@ton/sandbox/dist/blockchain/BlockchainBase'
import { BlockchainWithExecutor } from '@ton/sandbox/dist/blockchain/BlockchainWithExecutor'
import { ParsedInternal } from '@truecarry/tlb-abi'

export type ParsedTransaction = BlockchainTransaction & {
  parsed?: ParsedInternal
  parent?: ParsedTransaction | undefined
  children?: ParsedTransaction[]
}
export type ManagedSendMessageResult = {
  transactions: ParsedTransaction[]
}

export class ManagedBlockchain extends BlockchainWithExecutor {}
