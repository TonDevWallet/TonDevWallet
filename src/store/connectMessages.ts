import { getDatabase } from '@/db'
import { ConnectMessageTransaction, ConnectMessageTransactionPayload } from '@/types/connect'
import { hookstate, none, useHookstate } from '@hookstate/core'
import { Cell } from '@ton/core'

export interface TonConnectMessageTransaction {
  id: number
  // saved_wallet_id: number
  connect_session_id: number
  connect_event_id: number
  key_id: number
  wallet_id: number
  status: number
  payload: ConnectMessageTransactionPayload
  message_mode?: number

  message_cell?: string

  wallet_address?: string
  created_at?: Date
  updated_at?: Date
}

export const messagesState = hookstate<TonConnectMessageTransaction[]>(getConnectMessages)

export async function getConnectMessages() {
  const db = await getDatabase()
  const dbMessages = await db<ConnectMessageTransaction>('connect_message_transactions')
    .where({
      status: 0,
    })
    .select('*')

  const messages: TonConnectMessageTransaction[] = dbMessages.map((m) => {
    return {
      id: m.id,
      // saved_wallet_id: m.saved_wallet_id,
      connect_session_id: m.connect_session_id,
      connect_event_id: m.connect_event_id,
      status: m.status,
      key_id: m.key_id,
      wallet_id: m.wallet_id,
      payload: JSON.parse(m.payload),

      wallet_address: m.wallet_address,
      created_at: m.created_at,
      updated_at: m.updated_at,
    }
  })

  return messages
}

export function useMessagesState() {
  return useHookstate(messagesState)
}

export async function addConnectMessage(input: Omit<TonConnectMessageTransaction, 'id'>) {
  const db = await getDatabase()
  const res = await db<ConnectMessageTransaction>('connect_message_transactions')
    .insert({
      ...input,
      payload: JSON.stringify(input.payload),
      created_at: input.created_at ?? new Date(),
      updated_at: input.created_at ?? new Date(),
    })
    .returning('*')

  if (res.length < 1) {
    throw new Error("can't add session")
  }

  const message: TonConnectMessageTransaction = {
    ...res[0],
    payload: JSON.parse(res[0].payload),
  }

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
