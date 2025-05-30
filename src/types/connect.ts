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
  extra_currency?: { [k: number]: string }
  send_mode?: number // Message mode for smart contract execution
}

export interface ConnectMessageTransactionPayload {
  messages: ConnectMessageTransactionMessage[]
  valid_until: number // date now
}

export interface ConnectMessageSignPayload {
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
  payload?: string | null // ConnectMessageTransactionPayload
  wallet_address?: string
  message_cell?: string
  message_mode?: number
  sign_payload?: string | null
  message_type: 'tx' | 'sign'

  created_at: Date
  updated_at: Date
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
