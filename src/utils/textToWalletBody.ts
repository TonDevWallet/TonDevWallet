import { beginCell, Cell } from 'ton-core'

export function textToWalletBody(text: string | undefined, isBase64?: boolean): Cell | undefined {
  if (!text) {
    return undefined
  }

  return isBase64
    ? Cell.fromBase64(text)
    : beginCell().storeUint(0, 32).storeBuffer(Buffer.from(text)).endCell()
}
