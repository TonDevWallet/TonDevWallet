import { getDatabase } from '@/db'
import { ConnectSession } from '@/types/connect'
import { sendTonConnectMessage } from '@/utils/tonConnect'
import { hookstate, State, useHookstate } from '@hookstate/core'

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
}

const state = hookstate<TonConnectSession[]>(getSessions)

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
    }
  })

  return sessions
}

export function useTonConnectSessions() {
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
  }

  state.merge([session])
}

export async function deleteTonConnectSession(session: State<TonConnectSession>) {
  // const session =
  sendTonConnectMessage(
    {
      event: 'disconnect',
      payload: {},
    },
    session?.secretKey.get() || Buffer.from(''),
    session?.userId?.get() || ''
  )

  const db = await getDatabase()
  await db<ConnectSession>('connect_sessions')
    .where({
      id: session.id.get(),
    })
    .delete()

  state.set(await getSessions())
}
export async function updateSessionEventId(id: number, eventId: number) {
  const db = await getDatabase()
  const session = state.find((s) => s.get().id === id)
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
