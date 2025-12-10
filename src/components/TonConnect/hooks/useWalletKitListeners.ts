import { useEffect } from 'react'
import { State } from '@hookstate/core'
import { LiteClient } from 'ton-lite-client'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { CHAIN, Hex, TonWalletKit } from '@ton/walletkit'

import { addConnectMessage, messagesState } from '@/store/connectMessages'
import { TonConnectSession, deleteTonConnectSession } from '@/store/tonConnect'
import { getWalletKit } from '@/services/walletKit'
import { ensureKitWalletRegistered } from '@/services/walletKitAdapter'
import { setConnectRequest } from '@/store/walletKitRequests'
import { resolveWalletMeta, findKeyAndWallet } from './useWalletResolver'
import { getWalletFromKey } from '@/utils/wallets'
import { useLiteclientState } from '@/store/liteClient'

const appWindow = getCurrentWebviewWindow()

interface UseWalletKitListenersOptions {
  sessions: State<TonConnectSession[]>
  liteClient: LiteClient
  onConnectRequest: (manifestUrl: string) => void
}

/**
 * Registers all wallets from active sessions with WalletKit.
 * This is needed so WalletKit can route incoming events to the correct wallet.
 */
async function registerSessionWallets(
  kit: TonWalletKit,
  sessions: State<TonConnectSession[]>,
  liteClient: LiteClient,
  isTestnet: boolean
) {
  const chain = isTestnet ? CHAIN.TESTNET : CHAIN.MAINNET
  const sessionsData = sessions.get({ noproxy: true }) || []

  for (const session of sessionsData) {
    const keyWallet = findKeyAndWallet(session.keyId, session.walletId)
    if (!keyWallet) continue

    const { key, wallet: savedWallet } = keyWallet
    const tonWallet = getWalletFromKey(liteClient, key, savedWallet)
    if (!tonWallet) continue

    // Register wallet without secret key - we'll prompt for password when needed
    await ensureKitWalletRegistered(
      kit,
      tonWallet,
      chain,
      `0x${Buffer.from(key.public_key, 'base64').toString('hex')}` as Hex
    )
  }
}

/**
 * Sets up WalletKit listeners for connect, transaction, sign-data, and disconnect events.
 * Also registers wallets from existing sessions so WalletKit can route events to them.
 */
export function useWalletKitListeners({
  sessions,
  liteClient,
  onConnectRequest,
}: UseWalletKitListenersOptions) {
  const liteClientState = useLiteclientState()

  useEffect(() => {
    let unsubscribeKit: (() => void) | undefined

    const initListeners = async () => {
      console.log('useWalletKitListeners: initializing')
      try {
        const kit = await getWalletKit()
        const isTestnet = liteClientState.selectedNetwork.is_testnet.get()

        // Set up callbacks BEFORE registering wallets
        // This ensures we receive any stored events that WalletKit replays
        kit.onConnectRequest((req) => {
          console.log('onConnectRequest', req)
          setConnectRequest(req)
          onConnectRequest(req?.preview?.manifestUrl || '')
        })

        kit.onTransactionRequest(async (tx) => {
          console.log('onTransactionRequest', tx)

          const { keyId, walletId } = resolveWalletMeta(tx.walletAddress, liteClient)

          if (typeof keyId === 'undefined' || typeof walletId === 'undefined') {
            console.log('WalletKit tx: wallet not found for address', tx.walletAddress)
            return
          }

          // Check if message already exists in database (e.g., after reload)
          const existingMessages = messagesState.get({ noproxy: true })
          const exists = existingMessages.some(
            (m) => m.connect_event_id === parseInt(tx.id) && m.message_type === 'tx'
          )

          if (!exists) {
            const info = tx.request
            const payload = {
              messages: info.messages,
              valid_until: info.valid_until ?? Math.floor(Date.now() / 1000) + 300,
            }

            // Serialize the WalletKit request object for persistence
            const walletkitRequest = JSON.stringify(tx)

            await addConnectMessage({
              connect_event_id: parseInt(tx.id),
              connect_session_id: null as unknown as number,
              payload,
              key_id: keyId,
              wallet_id: walletId,
              status: 0,
              wallet_address: tx.walletAddress,
              message_type: 'tx',
              walletkit_request: walletkitRequest,
            })

            appWindow.unminimize()
            appWindow.setFocus()
          }
        })

        kit.onSignDataRequest(async (sd) => {
          console.log('onSignDataRequest', sd)

          const { keyId, walletId } = resolveWalletMeta(sd.walletAddress, liteClient)

          if (typeof keyId === 'undefined' || typeof walletId === 'undefined') {
            console.log('WalletKit sign: wallet not found for address', sd.walletAddress)
            return
          }

          // Check if message already exists in database (e.g., after reload)
          const existingMessages = messagesState.get({ noproxy: true })
          const exists = existingMessages.some(
            (m) => m.connect_event_id === parseInt(sd.id) && m.message_type === 'sign'
          )

          if (!exists) {
            // Serialize the WalletKit request object for persistence
            const walletkitRequest = JSON.stringify(sd)

            await addConnectMessage({
              message_type: 'sign',
              connect_event_id: parseInt(sd.id),
              connect_session_id: null as unknown as number,
              sign_payload: sd.request,
              key_id: keyId,
              wallet_id: walletId,
              status: 0,
              wallet_address: sd.walletAddress,
              walletkit_request: walletkitRequest,
            })

            appWindow.unminimize()
            appWindow.setFocus()
          }
        })

        kit.onDisconnect(async (evt) => {
          console.log('onDisconnect', evt)
          const session = sessions.find((s) => s.get().id.toString() === evt.sessionId)
          if (session) {
            await deleteTonConnectSession(session)
          }
        })

        // Register wallets AFTER setting up callbacks
        // This ensures we receive any stored events that WalletKit replays when wallets are added
        await registerSessionWallets(kit, sessions, liteClient, isTestnet)

        unsubscribeKit = () => {
          kit.removeConnectRequestCallback()
          kit.removeTransactionRequestCallback()
          kit.removeSignDataRequestCallback()
          kit.removeDisconnectCallback()
        }
      } catch (e) {
        console.log('WalletKit listeners error', e)
      }
    }

    initListeners()

    return () => {
      if (unsubscribeKit) {
        unsubscribeKit()
      }
    }
  }, [sessions, liteClient, onConnectRequest, liteClientState])
}
