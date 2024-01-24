import { HighloadDictionaryMessageValue } from '../utils/HighloadMessageDictionary'
import {
  Builder,
  Cell,
  contractAddress,
  Dictionary,
  external,
  internal,
  loadStateInit,
  Message,
  StateInit,
} from '@ton/core'
import { HighloadWalletInitData, WalletTransfer } from '../utils/HighloadWalletTypes'
import { HighloadWalletV2CodeCell } from './HighloadWalletV2.source'

export class HighloadWalletV2 {
  data: HighloadWalletInitData

  constructor(data: HighloadWalletInitData) {
    this.data = data
  }

  get address() {
    const highloadAddress = contractAddress(this.data.workchain, this.stateInit)
    return highloadAddress
  }

  get stateInit() {
    const walletStateInit = HighloadWalletV2.BuildStateInit(this.data)
    return walletStateInit
  }

  static BuildDataCell(data: HighloadWalletInitData): Cell {
    const dataCell = new Builder()

    dataCell.storeUint(data.subwalletId, 32)
    dataCell.storeUint(0, 64)
    dataCell.storeBuffer(data.publicKey)
    dataCell.storeDict(Dictionary.empty(Dictionary.Keys.Int(16), HighloadDictionaryMessageValue))

    return dataCell.endCell()
  }

  static BuildStateInit(data: HighloadWalletInitData): StateInit {
    const stateInit = {
      code: HighloadWalletV2CodeCell,
      data: HighloadWalletV2.BuildDataCell(data),
    }

    return stateInit
  }

  static GenerateQueryId(timeout: number, randomId?: number) {
    const now = Math.floor(Date.now() / 1000)
    const random = randomId || Math.floor(Math.random() * 2 ** 30)

    return (BigInt(now + timeout) << 32n) | BigInt(random)
  }

  CreateTransferMessage(transfers: WalletTransfer[], _queryId?: bigint): Message {
    if (!transfers.length || transfers.length > 254) {
      throw new Error('ContractHighloadWalletV2: can make only 1 to 254 transfers per operation.')
    }

    const queryId = _queryId || HighloadWalletV2.GenerateQueryId(60)

    const dictBuilder = Dictionary.empty(Dictionary.Keys.Int(16), HighloadDictionaryMessageValue)
    for (let i = 0; i < transfers.length; i++) {
      const v = transfers[i]
      const internalMsg = internal({
        to: v.destination,
        bounce: v.bounce ?? false,
        value: v.amount,
        body: v.body,
      })
      if (v.state) {
        internalMsg.init = loadStateInit(v.state.asSlice())
      }

      dictBuilder.set(i, {
        message: internalMsg,
        sendMode: v.mode,
      })
    }

    const body = new Builder().storeUint(this.data.subwalletId, 32).storeUint(queryId, 64)
    body.storeDict(dictBuilder)

    const msg = external({
      to: this.address,
      body: body.endCell(),
      init: this.stateInit,
    })

    return msg
  }
}
