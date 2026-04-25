import { Buffer } from 'buffer'
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
  autoSend: boolean
}

export interface TonConnectState {
  sessions: TonConnectSession[]
  popupOpen: boolean
  connectArg: string
  qrcodeOpen: boolean
}

const state = hookstate<TonConnectState>({
  sessions: [
    {
      id: 1,
      secretKey: Buffer.alloc(32),
      userId: 'storybook-user',
      walletId: 101,
      lastEventId: 7,
      keyId: 1,
      url: 'https://dapp.example',
      name: 'Example dApp',
      iconUrl: '',
      autoSend: false,
    },
  ],
  popupOpen: false,
  connectArg: '',
  qrcodeOpen: false,
})

export async function getSessions() {
  return state.sessions.get({ noproxy: true }) as TonConnectSession[]
}

export function useTonConnectSessions() {
  return useHookstate(state).sessions
}

export function useTonConnectState() {
  return useHookstate(state)
}

export async function addTonConnectSession(session: Omit<TonConnectSession, 'id' | 'lastEventId' | 'autoSend'>) {
  state.sessions.merge([{ ...session, id: Date.now(), lastEventId: 0, autoSend: false }])
}

export async function setTonConnectSessionAutoSend({
  session,
  autoSend,
}: {
  session: State<TonConnectSession>
  autoSend: boolean
}) {
  session.autoSend.set(autoSend)
}

export async function deleteTonConnectSession(session: State<TonConnectSession>) {
  state.sessions.set(state.sessions.get({ noproxy: true }).filter((item) => item.id !== session.id.get()))
}

export async function updateSessionEventId(id: number, eventId: number) {
  const session = state.sessions.find((item) => item.id.get() === id)
  session?.lastEventId.set(eventId)
}

export function closeTonConnectPopup() {
  state.popupOpen.set(false)
}
