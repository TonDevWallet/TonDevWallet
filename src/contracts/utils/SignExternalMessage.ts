import { beginCell, Cell } from 'ton-core'
import { sign } from 'ton-crypto'

export function SignCell(key: Buffer, message: Cell): Cell {
  if (!message) {
    return message
  }

  const signature = sign(message.hash(), key)

  const bodyCell = beginCell().storeBuffer(signature).storeBuilder(message.asBuilder()).endCell()

  return bodyCell
}
