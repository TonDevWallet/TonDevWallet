import {
  Blockchain,
  BlockchainStorage,
  LocalBlockchainStorage,
  SmartContract,
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
    result: Promise<ManagedSendMessageResult>
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
      const transaction = await contract.receiveMessage(message)

      if (emitter) {
        emitter.emit('complete_message')
      }

      const newContract = await this.getContract(message.info.dest)
      const fee = Number(transaction.totalFees.coins)

      if (newContract.accountState?.type === 'active' && newContract.accountState.state.code) {
        let opcode = ''
        const body = message.body.asSlice()
        if (body.remainingBits >= 32) {
          opcode = body.loadUint(32).toString(16)
        }
        const key = `${newContract.accountState.state.code.hash().toString('hex')}:${opcode}`
        const existing = this.#gasMap.get(key)
        if (existing) {
          this.#gasMap.set(key, {
            calls: existing.calls.concat([
              {
                lt: transaction.lt,
                gasSelf: fee,
                gasFull: fee,
              },
            ]),
          })
        } else {
          this.#gasMap.set(key, {
            calls: [
              {
                lt: transaction.lt,
                gasSelf: fee,
                gasFull: fee,
              },
            ],
          })
        }
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

      const resultTx: BlockchainTransaction = {
        ...transaction,
        children: [],
        gasSelf: fee,
        gasFull: fee,
      }

      if (parent) {
        parent.children.push(resultTx)
        // parent.gasFull += fee
        resultTx.parent = parent

        let parentParent: BlockchainTransaction | undefined = resultTx.parent
        while (parentParent) {
          parentParent.gasFull += fee

          for (const [key, mapVal] of this.#gasMap.entries()) {
            const calls = mapVal.calls

            let found = false
            for (let i = 0; i < calls.length; i++) {
              const call = calls[i]
              if (call.lt === parentParent.lt) {
                call.gasFull += fee
                calls[i] = call
                found = true
                break
              }
            }

            if (found) {
              this.#gasMap.set(key, { calls })
            }
          }

          parentParent = parentParent.parent
        }
      }

      result.push(resultTx)

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
      executor: await ManagedExecutor.create(),
      storage: opts?.storage ?? new LocalBlockchainStorage(),
      ...opts,
    })
  }
}
