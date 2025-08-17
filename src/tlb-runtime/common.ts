import { Buffer } from 'buffer'

import { BitString } from '@ton/core'

export function stringToBits(text: string): BitString {
  const bytes = Buffer.from(text, 'utf-8')
  return new BitString(bytes, 0, bytes.length * 8)
}

export function bitsToString(bits: BitString): string {
  if (bits.length % 8 !== 0) {
    throw new Error('Bits must be at least 8 bits')
  }
  let text = ''
  for (let offset = 0; offset < bits.length; offset += 8) {
    text += String.fromCharCode(parseInt(`0x${bits.substring(offset, 8).toString()}`))
  }

  return text
}

export function normalizeBitString(bits: BitString): BitString {
  const length = bits.length
  const newBuffer = Buffer.alloc(Math.ceil(length / 8))

  for (let i = 0; i < length; i++) {
    const byteIndex = Math.floor(i / 8)
    const bitIndex = 7 - (i % 8)

    if (bits.at(i)) {
      newBuffer[byteIndex] |= 1 << bitIndex
    }
  }
  return new BitString(newBuffer, 0, length)
}
