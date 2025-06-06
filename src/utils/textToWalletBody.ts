import { beginCell, Cell } from '@ton/core'

export function textToWalletBody(text: string | undefined, isRawCell?: boolean): Cell | undefined {
  if (!text) {
    return
  }

  if (isRawCell) {
    try {
      // Try parsing as hex-encoded BOC
      return Cell.fromBoc(Buffer.from(text, 'hex'))[0]
    } catch (e) {
      try {
        // Fallback to base64-encoded BOC
        return Cell.fromBase64(text)
      } catch (e2) {
        // Let the caller handle the error if both fail
        throw new Error('Invalid raw cell format. Must be a hex or base64 encoded string.')
      }
    }
  }

  // It's a text comment.
  return beginCell().storeUint(0, 32).storeStringTail(text).endCell()
}
