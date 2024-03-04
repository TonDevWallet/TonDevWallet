import { Cell } from '@ton/core'

export function getBase64Cell(data: string) {
  try {
    return Cell.fromBase64(data)
  } catch {
    return undefined
  }
}
