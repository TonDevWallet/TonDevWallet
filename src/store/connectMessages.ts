import { getDatabase } from '@/db'
import { ConnectMessageTransaction, ConnectMessageTransactionPayload } from '@/types/connect'
import { hookstate, none, useHookstate } from '@hookstate/core'
import { Cell } from '@ton/core'
import { SignDataPayload } from '@tonconnect/protocol'

export interface TonConnectMessage {
  id: number
  // saved_wallet_id: number
  connect_session_id: number
  connect_event_id: number
  key_id: number
  wallet_id: number
  status: number
  message_mode?: number
  message_type: 'tx' | 'sign' | 'addW5R1Plugin'

  message_cell?: string

  wallet_address?: string
  plugin_address?: string
  created_at?: Date
  updated_at?: Date
}

export type TonConnectMessageTransaction = TonConnectMessage & {
  message_type: 'tx'
  payload: ConnectMessageTransactionPayload
}

export type TonConnectMessageSign = TonConnectMessage & {
  message_type: 'sign'
  sign_payload: SignDataPayload
}

export type TonConnectMessageAddPlugin = TonConnectMessage & {
  message_type: 'addW5R1Plugin'
  plugin_address: string | undefined // null means addr_none (only removal, no install)
  plugins_to_remove?: string[]
}

export type TonConnectMessageRecord =
  | TonConnectMessageSign
  | TonConnectMessageTransaction
  | TonConnectMessageAddPlugin
export type FullTonConnectMessage = TonConnectMessage & {
  message_type: 'tx' | 'sign' | 'addW5R1Plugin'
  payload?: ConnectMessageTransactionPayload
  sign_payload?: SignDataPayload
  plugin_address?: string | undefined
  plugins_to_remove?: string[]
}

export function parseDbMessage(m: ConnectMessageTransaction): TonConnectMessageRecord {
  const base: Omit<TonConnectMessage, 'message_type'> = {
    id: m.id,
    connect_session_id: m.connect_session_id,
    connect_event_id: m.connect_event_id,
    status: m.status,
    key_id: m.key_id,
    wallet_id: m.wallet_id,
    message_cell: m.message_cell,
    message_mode: m.message_mode,
    wallet_address: m.wallet_address,
    created_at: m.created_at,
    updated_at: m.updated_at,
  }

  switch (m.message_type) {
    case 'tx':
      return {
        ...base,
        message_type: 'tx',
        payload: m.payload ? JSON.parse(m.payload) : undefined,
      }
    case 'sign':
      return {
        ...base,
        message_type: 'sign',
        sign_payload: m.sign_payload ? JSON.parse(m.sign_payload) : undefined,
      }
    case 'addW5R1Plugin':
      return {
        ...base,
        message_type: 'addW5R1Plugin',
        plugin_address: m.plugin_address ?? undefined,
        plugins_to_remove: m.plugins_to_remove ? JSON.parse(m.plugins_to_remove) : undefined,
      }
  }
}

export const messagesState = hookstate<TonConnectMessageRecord[]>(getConnectMessages)

export async function getConnectMessages(): Promise<TonConnectMessageRecord[]> {
  const db = await getDatabase()
  const dbMessages = await db<ConnectMessageTransaction>('connect_message_transactions')
    .where({
      status: 0,
    })
    .select('*')

  return dbMessages.map(parseDbMessage)
}

export function useMessagesState() {
  return useHookstate(messagesState)
}

export async function addConnectMessage(input: Omit<FullTonConnectMessage, 'id'>) {
  const db = await getDatabase()
  const res = await db<ConnectMessageTransaction>('connect_message_transactions')
    .insert({
      ...input,
      payload: input.payload ? JSON.stringify(input.payload) : null,
      sign_payload: input.sign_payload ? JSON.stringify(input.sign_payload) : null,
      plugin_address: input.plugin_address ?? null,
      plugins_to_remove: input.plugins_to_remove ? JSON.stringify(input.plugins_to_remove) : null,
      created_at: input.created_at ?? new Date(),
      updated_at: input.created_at ?? new Date(),
    })
    .returning('*')

  if (res.length < 1) {
    throw new Error("can't add session")
  }

  const message = parseDbMessage(res[0])
  messagesState.merge([message])
}

export async function changeConnectMessageStatus(
  messageId: number,
  newStatus: 0 | 1 | 2,
  messageCell?: Cell
) {
  const db = await getDatabase()
  await db<ConnectMessageTransaction>('connect_message_transactions')
    .where({
      id: messageId,
    })
    .update({
      status: newStatus,
      updated_at: new Date(),
      message_cell: messageCell?.toBoc().toString('base64'),
    })

  await removeConnectMessages()
}

export async function removeConnectMessages() {
  const newMessages = await getConnectMessages()
  messagesState.merge((old) => {
    const deleteA = {}
    for (let i = 0; i < old.length; i++) {
      if (!newMessages.find((m) => m.id === old[i].id)) {
        deleteA[i] = none
      }
    }

    return deleteA
  })
}
