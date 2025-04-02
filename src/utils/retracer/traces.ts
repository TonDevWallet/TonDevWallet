export interface ToncenterV3TraceInfo {
  trace_state: 'complete' | 'partial' | string
  messages: number
  transactions: number
  pending_messages: number
  classification_state: 'unclassified' | string
}

export interface ToncenterV3TraceNode {
  tx_hash: string
  in_msg_hash: string
  children: ToncenterV3TraceNode[]
}

export interface ToncenterV3StoragePhase {
  storage_fees_collected: string
  status_change: 'unchanged' | 'frozen' | 'deleted' | string
}

export interface ToncenterV3ComputePhase {
  skipped: boolean
  success: boolean
  msg_state_used: boolean
  account_activated: boolean
  gas_fees: string
  gas_used: string
  gas_limit: string
  mode: number
  exit_code: number
  vm_steps: number
  vm_init_state_hash: string
  vm_final_state_hash: string
}

export interface ToncenterV3ActionPhase {
  success: boolean
  valid: boolean
  no_funds: boolean
  status_change: 'unchanged' | 'frozen' | 'deleted' | string
  total_fwd_fees: string
  total_action_fees: string
  result_code: number
  tot_actions: number
  spec_actions: number
  skipped_actions: number
  msgs_created: number
  action_list_hash: string
  tot_msg_size?: {
    cells: string
    bits: string
  }
}

export interface ToncenterV3BlockRef {
  workchain: number
  shard: string
  seqno: number
}

export interface ToncenterV3Message {
  hash: string
  source: string | null
  destination: string | null
  value: string | null
  value_extra_currencies?: Record<string, string>
  fwd_fee?: string
  ihr_fee?: string
  created_lt?: string
  created_at?: string
  opcode?: string
  ihr_disabled?: boolean
  bounce?: boolean
  bounced?: boolean
  import_fee?: string | null
  message_content?: {
    hash: string
    body: string
    decoded: any
  }
  init_state?: string | null
}

export interface ToncenterV3AccountState {
  hash: string
  balance: string
  extra_currencies: Record<string, string>
  account_status: 'active' | 'frozen' | 'uninitialized' | string
  frozen_hash: string | null
  data_hash: string | null
  code_hash: string | null
}

export interface ToncenterV3AddressInfo {
  user_friendly: string
  domain: string | null
}

export interface ToncenterV3TokenInfo {
  type: string
  name: string
  symbol: string
  image: string
  extra?: {
    _image_big?: string
    _image_medium?: string
    _image_small?: string
    decimals?: string
    uri?: string
  }
}

export interface ToncenterV3MetadataInfo {
  is_indexed?: boolean
  token_info?: ToncenterV3TokenInfo[]
}

export interface ToncenterV3TransactionDescription {
  type:
    | 'ord'
    | 'storage'
    | 'tick-tock'
    | 'split-prepare'
    | 'split-install'
    | 'merge-prepare'
    | 'merge-install'
    | string
  aborted: boolean
  destroyed: boolean
  credit_first: boolean
  storage_ph?: ToncenterV3StoragePhase
  compute_ph: ToncenterV3ComputePhase
  action: ToncenterV3ActionPhase
}

export interface Transaction {
  account: string
  hash: string
  lt: string
  now: number
  mc_block_seqno: number
  trace_id: string
  prev_trans_hash: string
  prev_trans_lt: string
  orig_status: 'active' | 'frozen' | 'uninitialized' | string
  end_status: 'active' | 'frozen' | 'uninitialized' | string
  total_fees: string
  total_fees_extra_currencies: Record<string, string>
  description: ToncenterV3TransactionDescription
  block_ref: ToncenterV3BlockRef
  in_msg: ToncenterV3Message
  out_msgs: ToncenterV3Message[]
  account_state_before: ToncenterV3AccountState
  account_state_after: ToncenterV3AccountState
  emulated: boolean
}

export interface ToncenterV3Trace {
  trace_id: string
  external_hash: string
  mc_seqno_start: string
  mc_seqno_end: string
  start_lt: string
  start_utime: number
  end_lt: string
  end_utime: number
  trace_info: ToncenterV3TraceInfo
  is_incomplete: boolean
  trace: ToncenterV3TraceNode
  transactions_order: string[]
  transactions: Record<string, Transaction>
  addresses: Record<string, ToncenterV3AddressInfo>
  metadata: Record<string, ToncenterV3MetadataInfo>
}

export interface ToncenterV3Traces {
  traces: ToncenterV3Trace[]
}
