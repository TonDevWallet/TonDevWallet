import { addTonConnectSession, closeTonConnectPopup, useTonConnectState } from '@/store/tonConnect'
import { ConnectRequest } from '@tonconnect/protocol'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ReactPopup } from '../Popup'
import { fetch as tFetch } from '@tauri-apps/api/http'
import { useWalletListState } from '@/store/walletsListState'
import { KeyJazzicon } from '../KeyJazzicon'
import { cn } from '@/utils/cn'
import { Block } from '../ui/Block'
import { WalletJazzicon } from '../WalletJazzicon'
import { IWallet } from '@/types'
import { getWalletFromKey } from '@/utils/wallets'
import { useLiteclient } from '@/store/liteClient'
import { LiteClient } from 'ton-lite-client'
import { AddressRow } from '../AddressRow'
import { BlueButton } from '../ui/BlueButton'
import { sendTonConnectStartMessage } from './TonConnect'
import { decryptWalletData, getPasswordInteractive } from '@/store/passwordManager'
import { KeyPair } from '@ton/crypto'
import { getDatabase } from '@/db'
import { LastSelectedWallets } from '@/types/connect'
import { randomX25519 } from '@/utils/ed25519'

export function TonConnectPopup() {
  const tonConnectState = useTonConnectState()

  return (
    <ReactPopup
      modal
      open={tonConnectState.popupOpen.get()}
      onClose={closeTonConnectPopup}
      className="connect-modal"
    >
      <ConnectPopupContent />
    </ReactPopup>
  )
}

function ConnectPopupContent() {
  const tonConnectState = useTonConnectState()
  const keys = useWalletListState()
  const liteClient = useLiteclient() as unknown as LiteClient
  const connectLinkInfo = useConnectLink(tonConnectState.connectArg.get())

  const [isLoading, setIsLoading] = useState(false)
  const [chosenKeyId, setChosenKeyIdValue] = useState<number | undefined>()
  const [chosenWalletId, setChosenWalletId] = useState<number | undefined>()

  useEffect(() => {
    ;(async () => {
      if (!connectLinkInfo?.url) {
        return
      }
      const db = await getDatabase()
      const savedInfo = await db<LastSelectedWallets>('last_selected_wallets')
        .where({
          url: connectLinkInfo?.url,
        })
        .first()

      if (!savedInfo) {
        return
      }

      const key = keys.find((k) => k.id.get() === savedInfo.key_id)
      const wallet = key?.wallets.get()?.find((w) => w.id === savedInfo.wallet_id)

      if (key && wallet) {
        setChosenKeyId(key.id.get(), wallet.id)
      }
    })()
  }, [connectLinkInfo])

  const chosenKey = useMemo(() => keys.find((k) => k.id.get() === chosenKeyId), [chosenKeyId, keys])
  const wallets = useMemo<IWallet[]>(() => {
    if (!chosenKey?.public_key) {
      return []
    }

    const wallets: IWallet[] =
      chosenKey.wallets.get()?.map((w) => {
        const newWallet = getWalletFromKey(liteClient, chosenKey.get(), w)
        if (!newWallet) {
          throw new Error('no wallet')
        }

        return newWallet
      }) || []

    return wallets
  }, [chosenKey, chosenKey?.wallets, liteClient])
  const chosenWallet = useMemo(
    () => wallets.find((w) => w.id === chosenWalletId),
    [wallets, chosenWalletId]
  )

  const setChosenKeyId = (v: number | undefined, walletId?: number) => {
    setChosenKeyIdValue(v)

    const chosenKey = keys.find((k) => k.id.get() === v)
    const wallets = chosenKey?.wallets?.get() || []
    setChosenWalletId(walletId || wallets[0]?.id)
  }

  const isButtonDisabled = isLoading || !chosenKeyId || !chosenWalletId

  const doBridgeAuth = useCallback(async () => {
    try {
      setIsLoading(true)
      if (!chosenWallet || !chosenKey || !connectLinkInfo) {
        return
      }

      const password = await getPasswordInteractive()
      const decryptedData = await decryptWalletData(password, chosenKey?.encrypted.get())

      const sessionKeypair = randomX25519() as KeyPair

      console.log('start connect, ', connectLinkInfo, tonConnectState.connectArg.get())

      await addTonConnectSession({
        secretKey: Buffer.from(sessionKeypair.secretKey),
        userId: connectLinkInfo.clientId,
        keyId: chosenKey.id.get(),
        walletId: chosenWallet.id,
        iconUrl: connectLinkInfo.iconUrl || '',
        name: connectLinkInfo.name,
        url: connectLinkInfo.url,
      })

      await sendTonConnectStartMessage(
        chosenWallet,
        decryptedData,
        connectLinkInfo.host,
        sessionKeypair,
        connectLinkInfo.clientId,
        connectLinkInfo.r
      )

      closeTonConnectPopup()
    } finally {
      setIsLoading(false)
    }
  }, [chosenKey, chosenWallet, connectLinkInfo])

  return (
    <div className="flex flex-col items-center h-full">
      <div className="w-full flex flex-col items-center pt-4 pb-4 border-b border-gray-500/50">
        {connectLinkInfo ? (
          <>
            {connectLinkInfo.iconUrl ? (
              <img src={connectLinkInfo.iconUrl} alt="icon" className="w-16 rounded-full" />
            ) : (
              <div className="blur-sm w-16 h-16 rounded-full bg-stone-800" />
            )}
            <div className="mt-2">
              <b>{connectLinkInfo.name}</b> wants to connect to your wallet
            </div>
            <a href={connectLinkInfo.url} target="_blank">
              {connectLinkInfo.url}
            </a>
          </>
        ) : (
          <>
            <div className="blur-sm w-16 h-16 rounded-full bg-stone-800" />
            <div className="mt-2">
              <b className="blur-sm">Wallet</b> wants to connect to your wallet
            </div>
            <div className="text-accent blur-sm">http://wallet.link</div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 w-full min-h-0 overflow-y-scroll p-2 h-full">
        <Block className="flex flex-col gap-2 h-min">
          {keys.map((k) => {
            return (
              <div
                onClick={() => setChosenKeyId(k.id.get())}
                className={cn(
                  'flex flex-shrink-0 flex-wrap items-center p-2 rounded',
                  'text-center cursor-pointer hover:bg-gray-600 h-12',
                  k.id.get() === chosenKeyId && '!bg-gray-500'
                )}
                key={k.id.get()}
              >
                <KeyJazzicon walletKey={k} diameter={24} />
                <div className="text-foreground ml-2">{k.name.get()}</div>
              </div>
            )
          })}
        </Block>

        {chosenKeyId && (
          <>
            <Block className="flex flex-col p-2 w-full gap-2 h-min">
              {wallets?.map((w) => {
                return (
                  <div
                    onClick={() => setChosenWalletId(w.id)}
                    className={cn(
                      'flex flex-shrink-0 flex-wrap items-center justify-start',
                      'p-2 rounded gap-2 hover:bg-gray-600 h-12 cursor-pointer',
                      w.id === chosenWalletId && '!bg-gray-500'
                    )}
                    key={w.id}
                  >
                    <WalletJazzicon wallet={w} diameter={24} />
                    <div className="text-foreground">{w.type}</div>
                    <AddressRow containerClassName="w-28" address={w.address} disableCopy={true} />
                  </div>
                )
              })}
            </Block>
          </>
        )}
      </div>

      <div className="w-full flex flex-shrink-0 justify-center items-center border-t border-gray-500/50 h-16 self-end">
        <BlueButton
          className={cn('mx-auto', isButtonDisabled && 'bg-gray-500')}
          onClick={doBridgeAuth}
          disabled={isButtonDisabled}
        >
          Connect
        </BlueButton>
      </div>
    </div>
  )
}

function useConnectLink(link: string) {
  const [info, setInfo] = useState<
    | {
        iconUrl: string
        name: string
        url: string
        host: string
        clientId: string
        r: ConnectRequest | undefined
      }
    | undefined
  >(undefined)

  useEffect(() => {
    const getData = async () => {
      if (!link) {
        return
      }
      const parsed = new URL(link.replace('--url=', ''))
      const clientId = parsed.searchParams.get('id') || ''
      const rString = parsed.searchParams.get('r')
      const r = rString ? (JSON.parse(rString) as ConnectRequest) : undefined

      if (!r) {
        return
      }

      const { data: metaInfo } = await tFetch<{
        iconUrl: string
        name: string
        url: string
      }>(r.manifestUrl)

      if (!metaInfo.name) {
        console.log('No connect meta', metaInfo)
      }

      if (!metaInfo.url) {
        const parsedJsonLink = new URL(r.manifestUrl)
        setInfo({
          iconUrl: metaInfo?.iconUrl,
          name: metaInfo?.name || parsedJsonLink.host,
          url: metaInfo?.url || parsedJsonLink.origin,
          host: parsedJsonLink.host,
          clientId,
          r,
        })
        return
      }

      let host = ''
      try {
        const serviceUrl = new URL(metaInfo.url)
        host = serviceUrl.host || ''
      } catch (e) {
        console.log('Service url error popup', metaInfo, r.manifestUrl)
      }

      setInfo({
        iconUrl: metaInfo.iconUrl,
        name: metaInfo.name,
        url: metaInfo.url,
        host,
        clientId,
        r,
      })
    }
    getData()
  }, [link])

  return info
}
