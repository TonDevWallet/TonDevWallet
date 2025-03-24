import { JettonPayloadWithParsed } from '@truecarry/tlb-abi'

export function checkForJettonPayload(obj: any): JettonPayloadWithParsed | undefined {
  if (!obj || typeof obj !== 'object') return undefined

  // Check if object is JettonPayloadWithParsed
  if (obj?.kind && obj?.kind === 'JettonPayload' && obj?.parsed) {
    return obj
  }

  if (typeof obj === 'object' && !Array.isArray(obj)) {
    for (const value of Object.values(obj)) {
      const result = checkForJettonPayload(value)
      if (result) return result
    }
  }

  // Check array items
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const result = checkForJettonPayload(item)
      if (result) return result
    }
  }

  return undefined
}
