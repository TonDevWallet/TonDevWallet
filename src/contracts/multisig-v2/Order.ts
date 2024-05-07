/* eslint-disable camelcase */
/* eslint-disable no-useless-constructor */
import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Dictionary,
} from '@ton/core'
import { Params } from './Constants'
import { endParse } from './Multisig'
// import { assert } from '../utils/utils'

export type OrderConfig = {
  multisig: Address
  orderSeqno: bigint
}

export function arrayToCell(arr: Array<Address>): Dictionary<number, Address> {
  const dict = Dictionary.empty(Dictionary.Keys.Uint(8), Dictionary.Values.Address())
  for (let i = 0; i < arr.length; i++) {
    dict.set(i, arr[i])
  }
  return dict
}

function cellToArray(addrDict: Cell | null): Array<Address> {
  let resArr: Array<Address> = []
  if (addrDict !== null) {
    const dict = Dictionary.loadDirect(
      Dictionary.Keys.Uint(8),
      Dictionary.Values.Address(),
      addrDict
    )

    for (let i = 0; i < dict.size; i++) {
      if (!dict.get(i)) throw new Error('invalid dict sequence')
    }

    resArr = dict.values()
  }
  return resArr
}

export function orderConfigToCell(config: OrderConfig): Cell {
  return beginCell()
    .storeAddress(config.multisig)
    .storeUint(config.orderSeqno, Params.bitsize.orderSeqno)
    .endCell()
}

export function parseOrderData(data: Cell) {
  const slice = data.beginParse()
  const multisigAddress = slice.loadAddress()
  const orderSeqno = slice.loadUintBig(256)

  if (slice.remainingBits === 0) throw new Error('Order not initialized')

  const threshold = slice.loadUint(8)
  const isExecuted = slice.loadBoolean()
  const signers = cellToArray(slice.loadRef())
  const approvalsMask = slice.loadUint(1 << 8)
  const approvalsNum = slice.loadUint(8)
  const expirationDate = slice.loadUint(48)
  const order = slice.loadRef()
  endParse(slice)

  return {
    multisigAddress,
    orderSeqno,
    threshold,
    isExecuted,
    signers,
    approvalsMask,
    approvalsNum,
    expirationDate,
    order,
  }
}

export class Order implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
    readonly configuration?: OrderConfig
  ) {}

  static createFromAddress(address: Address) {
    return new Order(address)
  }

  static createFromConfig(config: OrderConfig, code: Cell, workchain = 0) {
    const data = orderConfigToCell(config)
    const init = { code, data }

    return new Order(contractAddress(workchain, init), init, config)
  }

  async getOrderDataStrict(provider: ContractProvider) {
    /*
        (slice multisig, int order_seqno, int threshold,
                      int sent_for_execution?, cell signers,
                      int approvals, int approvals_num, int expiration_date,
                      cell order)
        */
    const { stack } = await provider.get('get_order_data', [])
    // assert(stack.remaining === 9, 'invalid get_order_data result')
    const multisig = stack.readAddress()
    const order_seqno = stack.readBigNumber()
    const threshold = stack.readNumber()
    const executed = stack.readBoolean()
    const signers = cellToArray(stack.readCell())
    const approvals = stack.readBigNumber()
    const approvals_num = stack.readNumber()
    const expiration_date = stack.readBigNumber()
    const order = stack.readCell()
    let approvalsArray: Array<boolean>
    if (approvals !== null) {
      approvalsArray = Array(256)
      for (let i = 0; i < 256; i++) {
        approvalsArray[i] = Boolean((1n << BigInt(i)) & approvals)
      }
    } else {
      approvalsArray = []
    }
    return {
      inited: true,
      multisig,
      order_seqno,
      threshold,
      executed,
      signers,
      approvals: approvalsArray,
      approvals_num,
      _approvals: approvals,
      expiration_date,
      order,
    }
  }
}
