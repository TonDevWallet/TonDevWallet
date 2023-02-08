import {
  Blockchain,
  BlockchainStorage,
  LocalBlockchainStorage,
  SendMessageResult,
  SmartContract,
} from '@ton-community/sandbox'
import { extractEvents } from '@ton-community/sandbox/dist/event/Event'
import { Executor } from '@ton-community/sandbox/dist/executor/Executor'
import { EventEmitter } from 'events'
import { Address, Cell, Message, Transaction } from 'ton-core'

const LT_ALIGN = 1000000n

export class ManagedBlockchain extends Blockchain {
  #lt = 0n
  #contractFetches = new Map<string, Promise<SmartContract>>()

  constructor(opts: { executor: Executor; config?: Cell; storage: BlockchainStorage }) {
    super(opts)

    this.messageQueue = []
  }

  sendMessageWithProgress(message: Message): {
    emitter: EventEmitter
    result: Promise<SendMessageResult>
  } {
    this.pushMessage(message)
    const emitter = new EventEmitter()
    return {
      emitter,
      result: this.runQueue(emitter),
    }
  }

  async runQueue(emitter?: EventEmitter) {
    const txes = await this.processQueue(emitter)
    if (emitter) {
      emitter.emit('add_message')
    }
    return {
      transactions: txes,
      events: txes.map((tx) => extractEvents(tx)).flat(),
    }
  }

  pushMessage(message: Message) {
    if (message.info.type === 'external-out') {
      throw new Error('Cant send external out message')
    }
    this.messageQueue.push(message)
  }

  async processQueue(emitter?: EventEmitter) {
    console.log('process queue')
    const result: Transaction[] = []

    while (this.messageQueue.length > 0) {
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
      const transaction = await (await this.getContract(message.info.dest)).receiveMessage(message)

      if (emitter) {
        emitter.emit('complete_message')
      }

      result.push(transaction)

      for (const message of transaction.outMessages.values()) {
        if (emitter && message.info.type !== 'external-out') {
          emitter.emit('add_message')
        }
        this.messageQueue.push(message)

        if (message.info.type === 'internal') {
          this.startFetchingContract(message.info.dest)
        }
      }
    }

    return result
  }

  private startFetchingContract(address: Address) {
    const addrString = address.toRawString()
    let promise = this.#contractFetches.get(addrString)
    if (promise !== undefined) {
      return promise
    }
    promise = this.storage.getContract(this, address)
    this.#contractFetches.set(addrString, promise)
    return promise
  }

  async getContract(address: Address) {
    const contract = await this.startFetchingContract(address)
    this.#contractFetches.delete(address.toRawString())
    return contract
  }

  static async create(opts?: { config?: Cell; storage?: BlockchainStorage }) {
    return new ManagedBlockchain({
      executor: await Executor.create(),
      storage: opts?.storage ?? new LocalBlockchainStorage(),
      ...opts,
    })
  }
}
