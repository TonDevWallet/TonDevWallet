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
