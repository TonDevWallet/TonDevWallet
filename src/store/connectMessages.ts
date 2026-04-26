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
  const dbMessages = await db.select<ConnectMessageTransaction>(
    'SELECT * FROM connect_message_transactions WHERE status = ?',
    [0]
  )

  return dbMessages.map(parseDbMessage)
}

export function useMessagesState() {
  return useHookstate(messagesState)
}

export async function addConnectMessage(input: Omit<FullTonConnectMessage, 'id'>) {
  const db = await getDatabase()
  const res = await db.select<ConnectMessageTransaction>(
    `
      INSERT INTO connect_message_transactions (
        connect_session_id,
        connect_event_id,
        key_id,
        wallet_id,
        status,
        message_mode,
        message_type,
        message_cell,
        wallet_address,
        payload,
        sign_payload,
        plugin_address,
        plugins_to_remove,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `,
    [
      input.connect_session_id,
      input.connect_event_id,
      input.key_id,
      input.wallet_id,
      input.status,
      input.message_mode ?? null,
      input.message_type,
      input.message_cell ?? null,
      input.wallet_address ?? null,
      input.payload ? JSON.stringify(input.payload) : null,
      input.sign_payload ? JSON.stringify(input.sign_payload) : null,
      input.plugin_address ?? null,
      input.plugins_to_remove ? JSON.stringify(input.plugins_to_remove) : null,
      input.created_at ?? new Date(),
      input.created_at ?? new Date(),
    ]
  )

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
  const updatedAt = new Date()

  if (messageCell) {
    await db.execute(
      `
        UPDATE connect_message_transactions
        SET status = ?, updated_at = ?, message_cell = ?
        WHERE id = ?
      `,
      [newStatus, updatedAt, messageCell.toBoc().toString('base64'), messageId]
    )
  } else {
    await db.execute(
      `
        UPDATE connect_message_transactions
        SET status = ?, updated_at = ?
        WHERE id = ?
      `,
      [newStatus, updatedAt, messageId]
    )
  }

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
