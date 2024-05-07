/* eslint-disable camelcase */
import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Dictionary,
  MessageRelaxed,
  Sender,
  SendMode,
  Slice,
  storeMessageRelaxed,
} from '@ton/core'
import { Op, Params } from './Constants'
// import { assert } from '../utils/utils'

export type MultisigConfig = {
  threshold: number
  signers: Array<Address>
  proposers: Array<Address>
  allowArbitrarySeqno: boolean
}

export type TransferRequest = { type: 'transfer'; sendMode: SendMode; message: MessageRelaxed }
export type UpdateRequest = {
  type: 'update'
  threshold: number
  signers: Array<Address>
  proposers: Array<Address>
}

export type Action = TransferRequest | UpdateRequest
export type Order = Array<Action>

function arrayToCell(arr: Array<Address>): Dictionary<number, Address> {
  const dict = Dictionary.empty(Dictionary.Keys.Uint(8), Dictionary.Values.Address())
  for (let i = 0; i < arr.length; i++) {
    dict.set(i, arr[i])
  }
  return dict
}

export function cellToArray(addrDict: Cell | null): Array<Address> {
  const addresses: { [key: string]: boolean } = {}

  let resArr: Array<Address> = []
  if (addrDict !== null) {
    const dict = Dictionary.loadDirect(
      Dictionary.Keys.Uint(8),
      Dictionary.Values.Address(),
      addrDict
    )

    for (let i = 0; i < dict.size; i++) {
      const address = dict.get(i)
      if (!address) throw new Error('invalid dict sequence')
      if (addresses[address.toRawString()]) throw new Error('duplicate address')
      addresses[address.toRawString()] = true
    }

    resArr = dict.values()
  }
  return resArr
}

export function multisigConfigToCell(config: MultisigConfig): Cell {
  return beginCell()
    .storeUint(0, Params.bitsize.orderSeqno)
    .storeUint(config.threshold, Params.bitsize.signerIndex)
    .storeRef(beginCell().storeDictDirect(arrayToCell(config.signers)))
    .storeUint(config.signers.length, Params.bitsize.signerIndex)
    .storeDict(arrayToCell(config.proposers))
    .storeBit(config.allowArbitrarySeqno)
    .endCell()
}

export function endParse(slice: Slice) {
  if (slice.remainingBits > 0 || slice.remainingRefs > 0) {
    throw new Error('remaining bits in data')
  }
}

export function parseMultisigData(data: Cell) {
  const slice = data.beginParse()
  const nextOderSeqno = slice.loadUintBig(256)
  const threshold = slice.loadUint(8)
  const signers = cellToArray(slice.loadRef())
  const signersCount = slice.loadUint(8)
  const proposers = cellToArray(slice.loadMaybeRef())
  const allowArbitraryOrderSeqno = slice.loadBit()
  endParse(slice)
  return {
    nextOderSeqno,
    threshold,
    signers,
    signersCount,
    proposers,
    allowArbitraryOrderSeqno,
  }
}

export class Multisig implements Contract {
  public orderSeqno: bigint

  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
    readonly configuration?: MultisigConfig
  ) {
    this.orderSeqno = 0n
  }

  static createFromAddress(address: Address) {
    const multisig = new Multisig(address)
    multisig.orderSeqno = 0n
    return multisig
  }

  static createFromConfig(config: MultisigConfig, code: Cell, workchain = 0) {
    const data = multisigConfigToCell(config)
    const init = { code, data }
    return new Multisig(contractAddress(workchain, init), init, config)
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0, Params.bitsize.op)
        .storeUint(0, Params.bitsize.queryId)
        .endCell(),
    })
  }

  static packTransferRequest(transfer: TransferRequest) {
    const message = beginCell().store(storeMessageRelaxed(transfer.message)).endCell()
    return beginCell()
      .storeUint(Op.actions.send_message, Params.bitsize.op)
      .storeUint(transfer.sendMode, 8)
      .storeRef(message)
      .endCell()
  }

  static packUpdateRequest(update: UpdateRequest) {
    return beginCell()
      .storeUint(Op.actions.update_multisig_params, Params.bitsize.op)
      .storeUint(update.threshold, Params.bitsize.signerIndex)
      .storeRef(beginCell().storeDictDirect(arrayToCell(update.signers)))
      .storeDict(arrayToCell(update.proposers))
      .endCell()
  }

  static packOrder(actions: Array<Action>) {
    const order_dict = Dictionary.empty(Dictionary.Keys.Uint(8), Dictionary.Values.Cell())
    if (actions.length > 255) {
      throw new Error('For action chains above 255, use packLarge method')
    } else {
      // pack transfers to the order_body cell
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i]
        const actionCell =
          action.type === 'transfer'
            ? Multisig.packTransferRequest(action)
            : Multisig.packUpdateRequest(action)
        order_dict.set(i, actionCell)
      }
      return beginCell().storeDictDirect(order_dict).endCell()
    }
  }

  static newOrderMessage(
    actions: Cell,
    expirationDate: number,
    isSigner: boolean,
    addrIdx: number,
    order_id: bigint,
    query_id: bigint
  ) {
    const msgBody = beginCell()
      .storeUint(Op.multisig.new_order, Params.bitsize.op)
      .storeUint(query_id, Params.bitsize.queryId)
      .storeUint(order_id, Params.bitsize.orderSeqno)
      .storeBit(isSigner)
      .storeUint(addrIdx, Params.bitsize.signerIndex)
      .storeUint(expirationDate, Params.bitsize.time)

    return msgBody.storeRef(actions).endCell()
  }

  async getOrderAddress(provider: ContractProvider, orderSeqno: bigint) {
    const { stack } = await provider.get('get_order_address', [{ type: 'int', value: orderSeqno }])
    // assert(stack.remaining === 1, 'invalid get_order_address result')
    return stack.readAddress()
  }

  async getOrderEstimate(provider: ContractProvider, order: Order, expiration_date: bigint) {
    const orderCell = Multisig.packOrder(order)
    const { stack } = await provider.get('get_order_estimate', [
      { type: 'cell', cell: orderCell },
      {
        type: 'int',
        value: expiration_date,
      },
    ])
    // assert(stack.remaining === 1, 'invalid get_order_estimate result')
    return stack.readBigNumber()
  }

  async getMultisigData(provider: ContractProvider) {
    const test = await provider.getState()
    console.log('contract state', test)
    const { stack } = await provider.get('get_multisig_data', [])
    // assert(stack.remaining === 4, 'invalid get_multisig_data result')
    const nextOrderSeqno = stack.readBigNumber()
    const threshold = stack.readBigNumber()
    const signers = cellToArray(stack.readCellOpt())
    const proposers = cellToArray(stack.readCellOpt())
    return { nextOrderSeqno, threshold, signers, proposers }
  }
}
