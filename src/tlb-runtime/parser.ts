import { Address, BitString, Cell } from '@ton/core'

import { unwrap } from './Result'
import { ParsedCell, parseTLB } from './TLBRuntime'

export function parseCell(schema: string, data: Cell | string): ParsedCell {
  return unwrap(parseTLB(schema).deserialize(data))
}

export function encodeCell(schema: string, data: ParsedCell | string): Cell {
  return unwrap(parseTLB(schema).serialize(data)).endCell()
}

// FIXME
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function replacer(_key: string, value: any): any {
  if (typeof value === 'bigint') {
    return value.toString()
  } else if (value instanceof Address) {
    return value.toString()
  } else if (value instanceof BitString) {
    return value.toString()
  } else if (value instanceof Cell) {
    return value.toBoc().toString('base64')
  }
  return value
}
