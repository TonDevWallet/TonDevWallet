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
import nacl from 'tweetnacl'
import { KeyPair } from 'ton-crypto'

export function TonConnectPopup() {
  const tonConnectState = useTonConnectState()
  const keys = useWalletListState()
  const liteClient = useLiteclient() as unknown as LiteClient
  const connectLinkInfo = useConnectLink(tonConnectState.connectArg.get())

  const [isLoading, setIsLoading] = useState(false)
  const [chosenKeyId, setChosenKeyIdValue] = useState<number | undefined>()
  const [chosenWalletId, setChosenWalletId] = useState<number | undefined>()

  const chosenKey = useMemo(() => keys.find((k) => k.id.get() === chosenKeyId), [chosenKeyId, keys])
  const wallets = useMemo<IWallet[]>(() => {
    if (!chosenKey?.public_key) {
      return []
    }

    const wallets: IWallet[] =
      chosenKey.wallets.get()?.map((w) => {
        console.log('get wallet from key', liteClient, chosenKey, w)
        const newWallet = getWalletFromKey(liteClient, chosenKey, w)
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

  const setChosenKeyId = (v: number | undefined) => {
    setChosenWalletId(undefined)
    setChosenKeyIdValue(v)
  }

  const isButtonDisabled = isLoading || !chosenKeyId || !chosenWalletId

  console.log('connectLinkInfo', connectLinkInfo)

  const onPopupOpen = () => {
    setChosenWalletId(undefined)
    setChosenKeyId(undefined)
  }

  const doBridgeAuth = useCallback(async () => {
    try {
      setIsLoading(true)
      if (!chosenWallet || !chosenKey || !connectLinkInfo) {
        return
      }

      const password = await getPasswordInteractive()
      const decryptedData = await decryptWalletData(password, chosenKey?.encrypted.get())

      const sessionKeypair = nacl.box.keyPair() as KeyPair

      await sendTonConnectStartMessage(
        chosenWallet,
        decryptedData,
        connectLinkInfo.host,
        sessionKeypair,
        connectLinkInfo.clientId,
        connectLinkInfo.r
      )

      await addTonConnectSession({
        secretKey: Buffer.from(sessionKeypair.secretKey),
        userId: connectLinkInfo.clientId,
        keyId: chosenKey.id.get(),
        walletId: chosenWallet.id,
        iconUrl: connectLinkInfo.iconUrl,
        name: connectLinkInfo.name,
        url: connectLinkInfo.url,
      })

      closeTonConnectPopup()
    } finally {
      setIsLoading(false)
    }
  }, [chosenKey, chosenWallet, connectLinkInfo])

  return (
    <ReactPopup
      modal
      open={tonConnectState.popupOpen.get()}
      onOpen={onPopupOpen}
      onClose={closeTonConnectPopup}
    >
      <div className="p-4">
        {connectLinkInfo && (
          <div className="flex flex-col w-[400px] items-center">
            <img src={connectLinkInfo.iconUrl} alt="icon" className="w-16 rounded-full" />
            <div className="mt-2">
              <b>{connectLinkInfo.name}</b> wants to connect to your wallet
            </div>
            <a href={connectLinkInfo.url} target="_blank">
              {connectLinkInfo.url}
            </a>

            <div>Choose wallet to connect</div>

            <div>Key:</div>
            <Block className="flex flex-wrap p-2">
              {keys.map((k) => {
                return (
                  <div
                    onClick={() => setChosenKeyId(k.id.get())}
                    className={cn(
                      'flex flex-col flex-shrink-0 flex-wrap w-32 items-center p-2 rounded',
                      k.id.get() === chosenKeyId && 'bg-gray-500'
                    )}
                  >
                    <KeyJazzicon walletKey={k} />
                    <div className="text-foreground mt-2">{k.name.get()}</div>
                  </div>
                )
              })}
            </Block>

            {chosenKeyId && (
              <>
                <div>Wallet:</div>
                <Block className="flex flex-wrap p-2">
                  {wallets?.map((w) => {
                    return (
                      <div
                        onClick={() => setChosenWalletId(w.id)}
                        className={cn(
                          'flex flex-col flex-shrink-0 flex-wrap w-32 items-center justify-center p-2 rounded',
                          w.id === chosenWalletId && 'bg-gray-500'
                        )}
                      >
                        <WalletJazzicon wallet={w} />
                        <div className="text-foreground mt-2">{w.type}</div>
                        <AddressRow
                          containerClassName="w-28"
                          address={w.address}
                          disableCopy={true}
                        />
                      </div>
                    )
                  })}
                </Block>
              </>
            )}

            <BlueButton
              className={cn('mt-4 mx-auto', isButtonDisabled && 'bg-gray-500')}
              onClick={doBridgeAuth}
              disabled={isButtonDisabled}
            >
              Connect
            </BlueButton>
          </div>
        )}
      </div>
    </ReactPopup>
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

      let host = ''
      try {
        const serviceUrl = new URL(metaInfo.url)
        host = serviceUrl.host || ''
      } catch (e) {
        console.log('Service url error')
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
