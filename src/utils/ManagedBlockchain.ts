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

interface GasInfo {
  calls: number[]
}

export class ManagedBlockchain extends Blockchain {
  #lt = 0n
  #contractFetches = new Map<string, Promise<SmartContract>>()
  #gasMap = new Map<string, GasInfo>()
  messageQueue: Message[]

  constructor(opts: { executor: Executor; config?: Cell; storage: BlockchainStorage }) {
    super(opts)
    // const b = await Blockchain.create()
    // this = b

    this.messageQueue = []
  }

  sendMessageWithProgress(message: Message): {
    emitter: EventEmitter
    result: Promise<SendMessageResult>
    gasMap?: Map<string, GasInfo>
  } {
    this.pushMessage(message)
    const emitter = new EventEmitter()
    return {
      emitter,
      result: this.runQueue(emitter),
      gasMap: this.#gasMap,
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

  protected pushMessage(message: Message) {
    if (message.info.type === 'external-out') {
      throw new Error('Cant send external out message')
    }
    this.messageQueue.push(message)
  }

  async processQueue(emitter?: EventEmitter) {
    console.log('process queue')
    const result: Transaction[] = []

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
      const transaction = await contract.receiveMessage(message)

      if (emitter) {
        emitter.emit('complete_message')
      }

      const newContract = await this.getContract(message.info.dest)

      if (newContract.accountState?.type === 'active' && newContract.accountState.state.code) {
        const fee = transaction.totalFees.coins
        let opcode = ''
        const body = message.body.asSlice()
        if (body.remainingBits >= 32) {
          opcode = body.loadUint(32).toString(16)
        }
        const key = `${newContract.accountState.state.code.hash().toString('hex')}:${opcode}`
        const existing = this.#gasMap.get(key)
        if (existing) {
          this.#gasMap.set(key, {
            calls: existing.calls.concat([Number(fee)]),
          })
        } else {
          this.#gasMap.set(key, {
            calls: [Number(fee)],
          })
        }
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

  // private startFetchingContract(address: Address) {
  //   const addrString = address.toRawString()
  //   let promise = this.#contractFetches.get(addrString)
  //   if (promise !== undefined) {
  //     return promise
  //   }
  //   promise = this.storage.getContract(this, address)
  //   this.#contractFetches.set(addrString, promise)
  //   return promise
  // }

  // async getContract(address: Address) {
  //   const contract = await this.startFetchingContract(address)
  //   this.#contractFetches.delete(address.toRawString())
  //   return contract
  // }

  static async create(opts?: { config?: Cell; storage?: BlockchainStorage }) {
    return new ManagedBlockchain({
      executor: await Executor.create(),
      storage: opts?.storage ?? new LocalBlockchainStorage(),
      ...opts,
    })
  }
}
