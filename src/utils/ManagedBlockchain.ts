import { Blockchain, BlockchainTransaction } from '@ton/sandbox'
// import { extractEvents } from '@ton/sandbox/dist/event/Event'
// import { Executor } from '@ton/sandbox/dist/executor/Executor'
// import { EventEmitter } from 'events'
// import { Cell, Message, loadMessage } from '@ton/core'
// import { ManagedExecutor } from './ManagedExecutor'

// const LT_ALIGN = 1000000n

// export interface GasInfo {
//   calls: {
//     lt: bigint
//     gasSelf: number
//     gasFull: number
//   }[]
// }

// export interface BlockchainTransaction extends SandboxBlockchainTransaction {
//   gasSelf: number
//   gasFull: number
//   parent?: BlockchainTransaction
//   children: BlockchainTransaction[]
// }
export type ManagedSendMessageResult = {
  transactions: BlockchainTransaction[]
  // events: Event[]
}

export class ManagedBlockchain extends Blockchain {}

// export class ManagedBlockchain extends Blockchain {
//   #lt = 0n
//   #contractFetches = new Map<string, Promise<SmartContract>>()
//   #gasMap = new Map<string, GasInfo>()
//   messageQueue: PendingMessage[]

//   constructor(opts: { executor: Executor; config?: Cell; storage: BlockchainStorage }) {
//     super(opts)
//     // const b = await Blockchain.create()
//     // this = b

//     this.messageQueue = []
//   }

//   async sendMessageWithProgress(
//     message: Message,
//     params?: MessageParams
//   ): Promise<{
//     emitter: EventEmitter
//     result: Promise<ManagedSendMessageResult>
//     gasMap?: Map<string, GasInfo>
//   }> {
//     console.log('sendMessageWithProgress', message)
//     await this.pushMessage(message)
//     const emitter = new EventEmitter()
//     return {
//       emitter,
//       result: this.runQueue({
//         emitter,
//         params,
//       }),
//       gasMap: this.#gasMap,
//     }
//   }

//   protected async runQueue({
//     emitter,
//     params,
//   }: {
//     emitter?: EventEmitter
//     params?: MessageParams
//   }) {
//     const txes = await this.processQueue({ emitter, params })
//     if (emitter) {
//       emitter.emit('add_message')
//     }
//     return {
//       transactions: txes,
//       events: txes.map((tx) => extractEvents(tx)).flat(),
//       externals: txes.map((tx) => tx.externals).flat(),
//     }
//   }

//   protected async pushMessage(message: Message | Cell) {
//     const msg = message instanceof Cell ? loadMessage(message.beginParse()) : message
//     if (msg.info.type === 'external-out') {
//       throw new Error('Cannot send external out message')
//     }
//     await this.lock.with(async () => {
//       this.messageQueue.push({
//         type: 'message',
//         ...msg,
//       })
//     })
//   }

//   async processQueue({
//     emitter,
//     params,
//   }: {
//     emitter?: EventEmitter
//     params?: MessageParams
//   }): Promise<BlockchainTransaction[]> {
//     params = {
//       now: this.now,
//       ...params,
//     }

//     console.log('process queue', this.messageQueue.length)
//     const result: BlockchainTransaction[] = []

//     let stopped = false
//     if (emitter) {
//       emitter.addListener('stop', () => {
//         stopped = true
//       })
//     }

//     while (this.messageQueue.length > 0) {
//       if (stopped) {
//         break
//       }
//       // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//       const message = this.messageQueue.shift()!

//       let tx: SmartContractTransaction
//       if (message.type === 'message') {
//         if (message.info.type === 'external-out') {
//           continue
//         }

//         this.currentLt += LT_ALIGN
//         const receiver = await this.getContract(message.info.dest)
//         console.log('receiver', receiver)
//         tx = await receiver.receiveMessage(message, params)
//       } else {
//         this.currentLt += LT_ALIGN
//         tx = (await this.getContract(message.on)).runTickTock(message.which, params)
//       }

//       const fee = Number(tx.totalFees.coins)
//       const transaction: BlockchainTransaction = {
//         ...tx,
//         events: extractEvents(tx),
//         children: [],
//         externals: [],
//         gasFull: fee,
//         gasSelf: fee,
//       }

//       if (message.parentTransaction) {
//         transaction.parent = message.parentTransaction as BlockchainTransaction
//       }

//       if (message.type === 'message' && message.info.type === 'internal') {
//         const newContract = await this.getContract(message.info.dest)
//         if (newContract.accountState?.type === 'active' && newContract.accountState.state.code) {
//           let opcode = ''
//           const body = message.body.asSlice()
//           if (body.remainingBits >= 32) {
//             opcode = body.loadUint(32).toString(16)
//           }
//           const key = `${newContract.accountState.state.code.hash().toString('hex')}:${opcode}`
//           const existing = this.#gasMap.get(key)
//           if (existing) {
//             this.#gasMap.set(key, {
//               calls: existing.calls.concat([
//                 {
//                   lt: transaction.lt,
//                   gasSelf: fee,
//                   gasFull: fee,
//                 },
//               ]),
//             })
//           } else {
//             this.#gasMap.set(key, {
//               calls: [
//                 {
//                   lt: transaction.lt,
//                   gasSelf: fee,
//                   gasFull: fee,
//                 },
//               ],
//             })
//           }
//         }
//       }

//       let parent = transaction.parent
//       while (parent) {
//         parent.gasFull += fee

//         for (const [key, mapVal] of this.#gasMap.entries()) {
//           const calls = mapVal.calls

//           let found = false
//           for (let i = 0; i < calls.length; i++) {
//             const call = calls[i]
//             if (call.lt === parent.lt) {
//               call.gasFull += fee
//               calls[i] = call
//               found = true
//               break
//             }
//           }

//           if (found) {
//             this.#gasMap.set(key, { calls })
//           }
//         }

//         parent = parent.parent
//       }

//       transaction.parent?.children.push(transaction)
//       result.push(transaction)

//       if (emitter) {
//         emitter.emit('complete_message')
//       }

//       for (const message of transaction.outMessages.values()) {
//         if (message.info.type === 'external-out') {
//           transaction.externals.push({
//             info: {
//               type: 'external-out',
//               src: message.info.src,
//               dest: message.info.dest ?? undefined,
//               createdAt: message.info.createdAt,
//               createdLt: message.info.createdLt,
//             },
//             init: message.init ?? undefined,
//             body: message.body,
//           })
//           continue
//         }

//         this.messageQueue.push({
//           type: 'message',
//           parentTransaction: transaction,
//           ...message,
//         })
//         emitter?.emit('add_message')

//         if (message.info.type === 'internal') {
//           this.startFetchingContract(message.info.dest)
//         }
//       }
//     }

//     return result
//   }

//   static async create(opts?: { config?: Cell; storage?: BlockchainStorage }) {
//     return new ManagedBlockchain({
//       executor: await ManagedExecutor.create(),
//       storage: opts?.storage ?? new LocalBlockchainStorage(),
//       ...opts,
//     })
//   }
// }
