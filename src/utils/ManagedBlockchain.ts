import {
  Blockchain,
  BlockchainStorage,
  LocalBlockchainStorage,
  Event,
} from '@ton-community/sandbox'
import { extractEvents } from '@ton-community/sandbox/dist/event/Event'
import { Executor } from '@ton-community/sandbox/dist/executor/Executor'
import { EventEmitter } from 'events'
import { Cell, Message, Transaction } from 'ton-core'
import { ManagedExecutor } from './ManagedExecutor'

const LT_ALIGN = 1000000n

export interface GasInfo {
  calls: {
    lt: bigint
    gasSelf: number
    gasFull: number
  }[]
}

export interface BlockchainTransaction extends Transaction {
  parent?: BlockchainTransaction
  children: BlockchainTransaction[]
  gasSelf: number
  gasFull: number
}

export type ManagedSendMessageResult = {
  transactions: BlockchainTransaction[]
  events: Event[]
}

export class ManagedBlockchain extends Blockchain {
  #lt = 0n
  messageQueue: Message[]

  #beforePushMessage?: (message: Message) => Message
  #beforeReceiveMessage?: (message: Message) => Message
  #afterRunMessage?: (
    // eslint-disable-next-line no-use-before-define
    blockchain: ManagedBlockchain,
    message: Message,
    transaction: BlockchainTransaction
  ) => Promise<BlockchainTransaction>

  constructor(opts: {
    executor: Executor
    config?: Cell
    storage: BlockchainStorage
    beforePushMessage?(message: Message): Message
    beforeReceiveMessage?(message: Message): Message
    afterRunMessage?(
      blockchain: ManagedBlockchain,
      message: Message,
      transaction: BlockchainTransaction
    ): Promise<BlockchainTransaction>
  }) {
    super(opts)
    // const b = await Blockchain.create()
    // this = b

    this.messageQueue = []
    this.#beforePushMessage = opts.beforePushMessage
    this.#beforeReceiveMessage = opts.beforeReceiveMessage
    this.#afterRunMessage = opts.afterRunMessage
  }

  sendMessageWithProgress(message: Message): {
    emitter: EventEmitter
    result: Promise<ManagedSendMessageResult>
    gasMap?: Map<string, GasInfo>
  } {
    this.pushMessage(message)
    const emitter = new EventEmitter()
    return {
      emitter,
      result: this.runQueue(),
      // gasMap: this.#gasMap,
    }
  }

  protected async runQueue(emitter?: EventEmitter) {
    const txes = await this.processQueue(emitter)
    if (emitter) {
      emitter.emit('add_message')
    }
    return {
      transactions: txes,
      events: txes.map((tx) => extractEvents(tx)).flat(),
    }
  }

  protected pushMessage(message: Message, allowExternalOut?: boolean) {
    if (message.info.type === 'external-out' && !allowExternalOut) {
      throw new Error('Cant send external out message')
    }
    this.messageQueue.push(this.#beforePushMessage ? this.#beforePushMessage(message) : message)
  }

  async processQueue(emitter?: EventEmitter): Promise<BlockchainTransaction[]> {
    console.log('process queue')
    const result: BlockchainTransaction[] = []

    let stopped = false
    if (emitter) {
      emitter.addListener('stop', () => {
        stopped = true
      })
    }

    while (this.messageQueue.length > 0) {
      if (stopped) {
        break
      }
      // console.log('process message')
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const message = this.messageQueue.shift()!

      if (message.info.type === 'external-out') {
        // if (emitter) {
        //   emitter.emit('complete_message')
        // }
        continue
      }

      this.#lt += LT_ALIGN
      const contract = await this.getContract(message.info.dest)

      const receiveTx = await contract.receiveMessage(
        this.#beforeReceiveMessage ? this.#beforeReceiveMessage(message) : message
      )
      const fee = Number(receiveTx.totalFees.coins)
      let transaction: BlockchainTransaction = {
        ...receiveTx,
        children: [],
        gasSelf: fee,
        gasFull: fee,
      }

      let parent: BlockchainTransaction | undefined
      if (message.info.type === 'internal') {
        for (const tx of result) {
          // Ignore already matched children
          if (tx.outMessagesCount === 0) {
            continue
          }

          if (tx.children.length === tx.outMessagesCount) {
            continue
          }

          for (const outMessage of tx.outMessages.values()) {
            if (outMessage.info.type === 'internal') {
              if (outMessage.info.createdLt === message.info.createdLt) {
                parent = tx
                break
              }
            }
          }

          if (parent) {
            break
          }
        }
      }
      if (parent) {
        parent.children.push(transaction)
        transaction.parent = parent
      }

      if (this.#afterRunMessage) {
        transaction = await this.#afterRunMessage(this, message, transaction)
      }

      if (emitter) {
        emitter.emit('complete_message')
      }

      result.push(transaction)

      for (const message of transaction.outMessages.values()) {
        if (emitter && message.info.type !== 'external-out') {
          emitter.emit('add_message')
        }
        this.pushMessage(message, true)
        // this.messageQueue.push(message)

        if (message.info.type === 'internal') {
          this.startFetchingContract(message.info.dest)
        }
      }
    }

    return result
  }

  static async create(opts?: {
    config?: Cell
    storage?: BlockchainStorage
    beforePushMessage?(message: Message): Message
    beforeReceiveMessage?(message: Message): Message
    afterRunMessage?(
      blockchain: ManagedBlockchain,
      message: Message,
      transaction: BlockchainTransaction
    ): Promise<BlockchainTransaction>
  }) {
    return new ManagedBlockchain({
      executor: await ManagedExecutor.create(),
      storage: opts?.storage ?? new LocalBlockchainStorage(),
      ...opts,
    })
  }
}
