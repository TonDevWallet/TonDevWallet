import { Blockchain, BlockchainTransaction } from '@ton/sandbox'

export type ManagedSendMessageResult = {
  transactions: BlockchainTransaction[]
}

export class ManagedBlockchain extends Blockchain {}
