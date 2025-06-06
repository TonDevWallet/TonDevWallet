import { beginCell, Cell, loadMessage, storeMessage } from '@ton/core'

export function bigIntToBuffer(data: bigint | undefined): Buffer {
  if (!data) {
    return Buffer.from([])
  }
  const hexStr = data.toString(16)
  const pad = hexStr.padStart(64, '0')
  const hashHex = Buffer.from(pad, 'hex')

  return hashHex
}

export function bigIntToHex(data: bigint | undefined): string {
  if (!data) {
    return ''
  }
  const hexStr = data.toString(16)
  const pad = hexStr.padStart(64, '0')

  return pad
}

export function tonToNumber(ton: bigint | number): number {
  return Number(ton) / 10 ** 9
}

export function NormalizeMessage(cell: Cell): Cell {
  const msg = loadMessage(cell.beginParse())
  if (msg.init) {
    msg.init = null
  }
  if (msg.info.type === 'external-in') {
    msg.info.src = null
    msg.info.importFee = 0n
  }

  return beginCell()
    .store(storeMessage(msg, { forceRef: true }))
    .endCell()
}
