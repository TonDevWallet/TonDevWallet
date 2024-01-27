import { getDatabase } from '@/db'
import { ConnectMessageTransaction, ConnectSession, LastSelectedWallets } from '@/types/connect'
import { sendTonConnectMessage } from '@/utils/tonConnect'
import { hookstate, State, useHookstate } from '@hookstate/core'
import { removeConnectMessages } from './connectMessages'

export interface TonConnectSession {
  id: number
  secretKey: Buffer
  userId: string
  walletId: number
  lastEventId: number
  keyId: number
  url: string
  name: string
  iconUrl: string
  autoSend: boolean
}

export interface TonConnectState {
  sessions: TonConnectSession[]

  popupOpen: boolean
  connectArg: string
}

const state = hookstate<TonConnectState>(async () => {
  return {
    sessions: await getSessions(),

    popupOpen: false,
    connectArg: '',
  }
})

async function getSessions() {
  const db = await getDatabase()
  const dbSessions = await db<ConnectSession>('connect_sessions').select('*')

  const sessions: TonConnectSession[] = dbSessions.map((dbSession) => {
    return {
      secretKey: Buffer.from(dbSession.secret_key, 'hex'),
      userId: dbSession.user_id,
      walletId: dbSession.wallet_id,
      lastEventId: dbSession.last_event_id,
      id: dbSession.id,
      keyId: dbSession.key_id,
      url: dbSession.url,
      name: dbSession.name,
      iconUrl: dbSession.icon_url,
      autoSend: dbSession.auto_send,
    }
  })

  return sessions
}

export function useTonConnectSessions() {
  const hook = useHookstate(state)
  return hook.sessions
}

export function useTonConnectState() {
  return useHookstate(state)
}

export async function addTonConnectSession({
  secretKey,
  userId,
  keyId,
  walletId,
  url,
  name,
  iconUrl,
}: // walletType,
// subwalletId,
{
  secretKey: Buffer
  userId: string
  keyId: number
  walletId: number
  url: string
  name: string
  iconUrl: string
}) {
  const db = await getDatabase()
  const res = await db<ConnectSession>('connect_sessions')
    .insert({
      secret_key: secretKey.toString('hex'),
      user_id: userId,
      key_id: keyId,
      wallet_id: walletId,
      last_event_id: 0,
      url,
      name,
      icon_url: iconUrl,
    })
    .returning('*')

  if (res.length < 1) {
    throw new Error("can't add session")
  }

  await db<LastSelectedWallets>('last_selected_wallets')
    .insert({
      url,
      key_id: keyId,
      wallet_id: walletId,
    })
    .onConflict('url')
    .merge()

  const session: TonConnectSession = {
    secretKey,
    userId,
    walletId,
    lastEventId: 0,
    id: res[0].id,
    keyId,
    iconUrl,
    name,
    url,
    autoSend: false,
  }

  state.sessions.merge([session])
}

export async function setTonConnectSessionAutoSend({
  session,
  autoSend,
}: {
  session: State<TonConnectSession>
  autoSend: boolean
}) {
  const db = await getDatabase()
  await db<ConnectSession>('connect_sessions')
    .where({
      id: session.id.get(),
    })
    .update({
      auto_send: autoSend,
    })
  state.sessions.set(await getSessions())
}

export async function deleteTonConnectSession(session: State<TonConnectSession>) {
  // const session =

  await sendTonConnectMessage(
    {
      event: 'disconnect',
      payload: {},
      id: Date.now(),
    },
    session?.secretKey.get() || Buffer.from(''),
    session?.userId?.get() || ''
  )

  const db = await getDatabase()
  await db<ConnectMessageTransaction>('connect_message_transactions')
    .where({
      connect_session_id: session.id.get(),
    })
    .delete()
  await db<ConnectSession>('connect_sessions')
    .where({
      id: session.id.get(),
    })
    .delete()

  state.sessions.set(await getSessions())
  await removeConnectMessages()
}

export async function updateSessionEventId(id: number, eventId: number) {
  const db = await getDatabase()
  const session = state.sessions.find((s) => s.get().id === id)
  if (!session) {
    throw new Error('session not found')
  }
  session?.merge({
    lastEventId: eventId,
  })

  await db<ConnectSession>('connect_sessions')
    .where({
      secret_key: session.secretKey.get().toString('hex'),
    })
    .update({
      last_event_id: eventId,
    })
  console.log('updated', session, eventId)
}

export function closeTonConnectPopup() {
  state.popupOpen.set(false)
}
