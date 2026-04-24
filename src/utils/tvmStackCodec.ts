import { Cell, type TupleItem, serializeTuple } from '@ton/core'

/** Mirrors `StackSlotJson` from `src-tauri/src/tvm_runner.rs`. */
export type TvmStackSlotJson =
  | { kind: 'null' }
  | { kind: 'int'; dec: string }
  | { kind: 'nan' }
  | { kind: 'cell'; b64: string }
  | { kind: 'slice'; b64: string }
  | { kind: 'tuple'; items: TvmStackSlotJson[] }

function slotToTupleItem(s: TvmStackSlotJson): TupleItem {
  switch (s.kind) {
    case 'null':
      return { type: 'null' }
    case 'nan':
      return { type: 'nan' }
    case 'int':
      return { type: 'int', value: BigInt(s.dec) }
    case 'cell':
      return { type: 'cell', cell: Cell.fromBoc(Buffer.from(s.b64, 'base64'))[0] }
    case 'slice':
      return { type: 'slice', cell: Cell.fromBoc(Buffer.from(s.b64, 'base64'))[0] }
    case 'tuple':
      return { type: 'tuple', items: s.items.map(slotToTupleItem) }
    default:
      return { type: 'null' }
  }
}

/** Base64 BoC of the stack tuple for sandbox / `TupleReader`. */
export function tvmStackSlotsToStackBoc(slots: TvmStackSlotJson[]): string {
  const items = slots.map(slotToTupleItem)
  return serializeTuple(items).toBoc().toString('base64')
}
