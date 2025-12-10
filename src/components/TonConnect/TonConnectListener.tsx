import { useCallback } from 'react'
import { LiteClient } from 'ton-lite-client'

import { useLiteclient } from '@/store/liteClient'
import { useTonConnectSessions, useTonConnectState } from '@/store/tonConnect'
import { getWalletKit } from '@/services/walletKit'

import { useClipboardTonConnect, useWalletKitListeners } from './hooks'

/**
 * TonConnectListener - Orchestrates all TonConnect-related event listeners.
 *
 * Responsibilities are delegated to specialized hooks:
 * - useClipboardTonConnect: Handles paste events (QR codes, deep links)
 * - useWalletKitListeners: Handles WalletKit SDK events (connect, tx, sign, disconnect)
 *
 * Note: WalletKit internally manages SSE bridge connections for all sessions,
 * so we don't need separate bridge listeners.
 */
export function TonConnectListener() {
  const sessions = useTonConnectSessions()
  const liteClient = useLiteclient() as unknown as LiteClient
  const tonConnectState = useTonConnectState()

  // Callback to initiate TonConnect flow
  const startTonConnectFlow = useCallback(
    async (link: string) => {
      tonConnectState.connectArg.set(link)
      tonConnectState.popupOpen.set(true)
      try {
        const kit = await getWalletKit()
        await kit.handleTonConnectUrl(link)
      } catch (e) {
        console.log('WalletKit handleTonConnectUrl error', e)
      }
    },
    [tonConnectState]
  )

  // Callback for WalletKit connect requests
  const handleConnectRequest = useCallback(
    (manifestUrl: string) => {
      tonConnectState.connectArg.set(manifestUrl)
      tonConnectState.popupOpen.set(true)
    },
    [tonConnectState]
  )

  // Set up clipboard/paste listeners
  useClipboardTonConnect({
    onStartConnect: startTonConnectFlow,
  })

  // Set up WalletKit SDK listeners (handles all bridge events internally)
  useWalletKitListeners({
    sessions,
    liteClient,
    onConnectRequest: handleConnectRequest,
  })

  return null
}
