import {
  Builder,
  Cell,
  CellMessage,
  CommonMessageInfo,
  contractAddress,
  DictBuilder,
  ExternalMessage,
  InternalMessage,
  StateInit,
} from 'ton'
import BN from 'bn.js'
import { HighloadWalletInternalCodeCell } from './HighloadWalletInternal.source'
import { HighloadWalletInitData, WalletTransfer } from '../HighloadWalletTypes'

export class HighloadWalletInternal {
  data: HighloadWalletInitData

  constructor(data: HighloadWalletInitData) {
    this.data = data
  }

  get address() {
    const walletStateInit = this.stateInit
    const highloadAddress = contractAddress({
      workchain: this.data.workchain,
      initialCode: walletStateInit.code || new Cell(),
      initialData: walletStateInit.data || new Cell(),
    })

    return highloadAddress
  }

  get stateInit() {
    const walletStateInit = HighloadWalletInternal.BuildStateInit(this.data)
    return walletStateInit
  }

  static BuildDataCell(data: HighloadWalletInitData): Cell {
    const dataCell = new Builder()

    dataCell.storeUint(data.subwalletId, 32)
    dataCell.storeUint(0, 64)
    dataCell.storeBuffer(data.publicKey)
    dataCell.storeDict(new DictBuilder(16).endDict())

    return dataCell.endCell()
  }

  static BuildStateInit(data: HighloadWalletInitData): StateInit {
    const stateInit = new StateInit({
      code: HighloadWalletInternalCodeCell,
      data: HighloadWalletInternal.BuildDataCell(data),
    })

    return stateInit
  }

  static GenerateQueryId(timeout: number, randomId?: number) {
    const now = Math.floor(Date.now() / 1000)
    const random = randomId || Math.floor(Math.random() * 2 ** 30)

    return (BigInt(now + timeout) << 32n) | BigInt(random)
  }

  CreateTransferBody(transfers: WalletTransfer[], _queryId?: bigint): CommonMessageInfo {
    if (!transfers.length || transfers.length > 254) {
      throw new Error('ContractHighloadWalletV2: can make only 1 to 254 transfers per operation.')
    }

    const queryId = _queryId || HighloadWalletInternal.GenerateQueryId(60)

    const dictBuilder = new DictBuilder(16)
    for (let i = 0; i < transfers.length; i++) {
      const v = transfers[i]
      const internal = new InternalMessage({
        to: v.destination,
        bounce: v.bounce || false,
        value: v.amount,
        body: new CommonMessageInfo({
          body: v.body ? new CellMessage(v.body) : null,
          stateInit: v.state ? new CellMessage(v.state) : null,
        }),
      })

      const internalCell = new Cell()
      internal.writeTo(internalCell)

      const bodyCell = new Builder()
        .storeUint(v.mode, 8) // send mode
        .storeRef(internalCell)
        .endCell()

      dictBuilder.storeCell(i, bodyCell)
    }

    const body = new Builder()
      .storeUint(this.data.subwalletId, 32)
      .storeUint(new BN(queryId.toString()), 64)
    body.storeDict(dictBuilder.endDict())

    const msg = new CommonMessageInfo({
      body: new CellMessage(body.endCell()),
      stateInit: this.stateInit,
    })

    return msg
  }

  CreateExternalTransfer(body: CommonMessageInfo): ExternalMessage {
    return new ExternalMessage({
      to: this.address,
      body,
    })
  }

  CreateTransferMessage(transfers: WalletTransfer[], _queryId?: bigint): ExternalMessage {
    const body = this.CreateTransferBody(transfers, _queryId)
    return this.CreateExternalTransfer(body)
  }
}
