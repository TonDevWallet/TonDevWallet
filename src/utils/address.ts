import { Address } from '@ton/core'

export function SafeParseAddress(input: unknown): Address | null {
  if (input instanceof Address) {
    return input
  }
  if (typeof input === 'string') {
    try {
      return Address.parse(input)
    } catch (error) {
      return null
    }
  }
  return null
}
