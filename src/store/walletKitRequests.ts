import type { EventConnectRequest } from '@ton/walletkit'

// Connect requests are stored in memory only (short-lived, popup-based flow)
let connectRequest: EventConnectRequest | undefined

export function setConnectRequest(req: EventConnectRequest) {
  connectRequest = req
}

export function getConnectRequest() {
  return connectRequest
}

export function consumeConnectRequest() {
  const req = connectRequest
  connectRequest = undefined
  return req
}
