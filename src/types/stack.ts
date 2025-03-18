export interface StackInt {
  _: 'int'
  value: string
}

export interface StackCell {
  _: 'cell'
  value: string
  bits: [number, number]
  refs: [number, number]
}

export interface StackSlice {
  _: 'slice'
  value: string
  bits: [number, number]
  refs: [number, number]
}

export interface StackBuilder {
  _: 'builder'
  value: string
}

export interface StackCont {
  _: 'cont'
}

export type StackItem = (
  | StackInt
  | StackCell
  | StackSlice
  | StackCont
  | StackBuilder
  // eslint-disable-next-line no-use-before-define
  | StackTuple
) & {
  added?: boolean
  removed?: boolean
  index?: number
}

export interface StackTuple {
  _: 'tuple'
  items: StackItem[]
}
