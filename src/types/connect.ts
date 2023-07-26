export const ConnectMessageStatus = {
  NEW: 0,
  APPROVED: 1,
  REJECTED: 2,
} as const

export interface ConnectMessageTransactionMessage {
  address: string
  amount: string
  payload?: string // boc
  stateInit?: string
}

export interface ConnectMessageTransactionPayload {
  messages: ConnectMessageTransactionMessage[]
  valid_until: number // date now
}

export interface ConnectMessageTransaction {
  id: number
  // saved_wallet_id: number
  connect_session_id: number
  connect_event_id: number
  key_id: number
  wallet_id: number
  status: number // 0 - new, 1 - approved, 2 - rejected
  payload: string // ConnectMessageTransactionPayload
}

export interface ConnectSession {
  id: number
  secret_key: string
  user_id: string
  wallet_id: number
  last_event_id: number
  key_id: number
  url: string
  name: string
  icon_url: string
  auto_send: boolean
}

// last_selected_wallets
export interface LastSelectedWallets {
  url: string
  key_id: number
  wallet_id: number
}
