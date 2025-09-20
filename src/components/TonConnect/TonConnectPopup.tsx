import { addTonConnectSession, closeTonConnectPopup, useTonConnectState } from '@/store/tonConnect'
import { ConnectRequest } from '@tonconnect/protocol'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetch as tFetch } from '@tauri-apps/plugin-http'
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
import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog'
import { Address } from '@ton/core'
import { GlobalSearch } from '../GlobalSearch/GlobalSearch'
import { useSearchState } from '@/store/searchState'
import { AlertDialogDescription, AlertDialogTitle } from '@radix-ui/react-alert-dialog'
import { Key } from '@/types/Key'

const optionsMatrix = {
  bounceable: [true, false],
  urlSafe: [true, false],
  testOnly: [true, false],
}
const allOptionsPermutations = Object.keys(optionsMatrix).reduce(
  (acc, key) => {
    return acc.flatMap((a) => optionsMatrix[key].map((b) => ({ ...a, [key]: b })))
  },
  [{}]
)
function isWalletMatch(wallet: IWallet, keyName: string, query: string) {
  if (!query) return true

  const addressStringifiers = [
    ...allOptionsPermutations.map((options) => (a: Address) => a.toString(options)),
    (a: Address) => a.toRawString(),
  ]
  return (
    wallet.type.toLowerCase().includes(query.toLowerCase()) ||
    (wallet.name || '').toLowerCase().includes(query.toLowerCase()) ||
    keyName.toLowerCase().includes(query.toLowerCase()) ||
    addressStringifiers.some((stringify) =>
      stringify(wallet.address).toLowerCase().includes(query.toLowerCase())
    )
  )
}

export function TonConnectPopup() {
  const tonConnectState = useTonConnectState()

  return (
    <AlertDialog open={tonConnectState.popupOpen.get()}>
      <AlertDialogContent
        className={
          'w-3/4 max-w-[650px] h-screen overflow-hidden p-0 border-0 bg-transparent flex flex-col justify-center'
        }
      >
        <ConnectPopupContent />
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ConnectPopupContent() {
  const tonConnectState = useTonConnectState()
  const keys = useWalletListState()
  const liteClient = useLiteclient() as unknown as LiteClient
  const connectLinkInfo = useConnectLink(tonConnectState.connectArg.get())
  const searchState = useSearchState()

  const [isLoading, setIsLoading] = useState(false)
  const [chosenKeyId, setChosenKeyIdValue] = useState<number | undefined>()
  const [chosenWalletId, setChosenWalletId] = useState<number | undefined>()

  useEffect(() => {
    tonConnectState.qrcodeOpen.set(false)
  }, [])

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

  const filteredKeys = useMemo(() => {
    if (!searchState.wallet.get()) return keys

    return keys.filter((k) => {
      const keyWallets = k.wallets.get() || []
      const keyName = k.name.get()
      return (
        keyName.toLowerCase().includes(searchState.wallet.get().toLowerCase()) ||
        keyWallets.some((w) => {
          const wallet = getWalletFromKey(liteClient, k.get(), w)
          return wallet ? isWalletMatch(wallet, keyName, searchState.wallet.get()) : false
        })
      )
    })
  }, [keys, searchState.wallet, liteClient])

  const wallets = useMemo<IWallet[]>(() => {
    if (!chosenKey?.public_key) {
      return []
    }

    if (!filteredKeys.some((k) => k.id.get() === chosenKey.id.get())) {
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
  }, [chosenKey, chosenKey?.wallets, liteClient, filteredKeys])
  const chosenWallet = useMemo(
    () => wallets.find((w) => w.id === chosenWalletId),
    [wallets, chosenWalletId]
  )

  const filteredWallets = useMemo(() => {
    if (!searchState.wallet.get() || !wallets) return wallets

    const keyName = chosenKey?.name.get() || ''
    const filtered = wallets.filter((w) => isWalletMatch(w, keyName, searchState.wallet.get()))
    if (filtered.length === 0) {
      return wallets
    }
    return filtered
  }, [wallets, searchState.wallet, chosenKey])

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
        chosenKey.get() as Key,
        connectLinkInfo.r
      )

      closeTonConnectPopup()
    } finally {
      setIsLoading(false)
    }
  }, [chosenKey, chosenWallet, connectLinkInfo])

  // const [myIpAddress, setMyIpAddress] = useState<string | null>(null)
  // useEffect(() => {
  //   fetch('https://api.ipify.org?format=json')
  //     .then((res) => res.json())
  //     .then((data) => setMyIpAddress(data.ip))
  // }, [])

  // const [verifyIp, setVerifyIp] = useState(false)
  // useEffect(() => {
  //   async function loadVerifyIp() {
  //     console.log('loadVerifyIp', connectLinkInfo?.url)
  //     const url = new URL(connectLinkInfo?.url || '')
  //     const checkUrl = `${url.protocol}//${url.hostname}/`
  //     const data = await fetch(`${TonConnectBridgeUrl}/verify`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         client_id: connectLinkInfo?.clientId,
  //         url: checkUrl,
  //       }),
  //     })
  //     console.log('VERIFY IP', data)
  //     // const json = await data.json()
  //     if (data.status === 200) {
  //       setVerifyIp(true)
  //     } else {
  //       // console.log('verifyIp', json)
  //       setVerifyIp(false)
  //     }
  //     // setVerifyIp(json.ip)
  //   }
  //   loadVerifyIp()
  // }, [connectLinkInfo?.url])

  return (
    <div className="relative overflow-hidden my-8 max-h-[768px] h-full">
      <AlertDialogTitle></AlertDialogTitle>
      <AlertDialogDescription></AlertDialogDescription>
      <div className="h-full relative bg-background border rounded-xl flex flex-col">
        <div className="flex-none w-full flex flex-col items-center border-b border-gray-500/50">
          <div className="p-4 w-full flex flex-col items-center">
            {connectLinkInfo ? (
              <>
                {connectLinkInfo.iconUrl ? (
                  <img src={connectLinkInfo.iconUrl} alt="icon" className="w-16 rounded-full" />
                ) : (
                  <div className="blur-xs w-16 h-16 rounded-full bg-stone-800" />
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
                <div className="blur-xs w-16 h-16 rounded-full bg-stone-800" />
                <div className="mt-2">
                  <b className="blur-xs">Wallet</b> wants to connect to your wallet
                </div>
                <div className="text-accent blur-xs">https://wallet.link</div>
              </>
            )}

            {/* {!verifyIp && (
              <div className="text-red-500">
                <div>
                  IP of the request is not the same as your IP address, be carefull someone might me
                  impersonating dApp you're visiting now
                </div>
              </div>
            )} */}
          </div>

          <div className="w-full px-4 pb-4">
            <GlobalSearch placeholder="Search by address/name/type..." />
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 h-full p-2">
            <Block className="flex flex-col p-2 h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                {filteredKeys.map((k) => {
                  return (
                    <div
                      onClick={() => setChosenKeyId(k.id.get())}
                      className={cn(
                        'flex shrink-0 flex-wrap items-center p-2 rounded mb-2',
                        'text-center cursor-pointer hover:bg-gray-600 h-12',
                        k.id.get() === chosenKeyId && 'bg-gray-500!'
                      )}
                      key={k.id.get()}
                    >
                      <KeyJazzicon walletKey={k} diameter={24} />
                      <div className="text-foreground ml-2">{k.name.get()}</div>
                    </div>
                  )
                })}
              </div>
            </Block>

            {chosenKeyId && filteredWallets.length > 0 && (
              <Block className="flex flex-col p-2 h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  {filteredWallets?.map((w) => {
                    return (
                      <div
                        onClick={() => setChosenWalletId(w.id)}
                        className={cn(
                          'flex shrink-0 flex-wrap items-center justify-start',
                          'p-2 rounded gap-2 hover:bg-gray-600 h-12 cursor-pointer mb-2',
                          w.id === chosenWalletId && 'bg-gray-500!'
                        )}
                        key={w.id}
                      >
                        <WalletJazzicon wallet={w} diameter={24} />
                        <div className="text-foreground">{w.name || w.type}</div>
                        <AddressRow
                          containerClassName="flex-1 min-w-0"
                          address={w.address}
                          disableCopy={true}
                        />
                      </div>
                    )
                  })}
                </div>
              </Block>
            )}
          </div>
        </div>

        <div className="flex-none w-full flex justify-center gap-4 items-center border-t border-gray-500/50 p-4">
          <BlueButton variant={'outline'} onClick={closeTonConnectPopup}>
            Cancel
          </BlueButton>
          <BlueButton
            className={cn(isButtonDisabled && 'bg-gray-500')}
            onClick={doBridgeAuth}
            disabled={isButtonDisabled}
          >
            Connect
          </BlueButton>
        </div>
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

      let metaInfo:
        | {
            iconUrl?: string
            name?: string
            url?: string
          }
        | undefined
      try {
        const response = await tFetch(r.manifestUrl, {
          connectTimeout: 3000,
        })
        const data = await response.json()
        metaInfo = data
      } catch (e) {
        //
      }

      if (!metaInfo) {
        metaInfo = {}
      }

      if (!metaInfo.name) {
        console.log('No connect meta', metaInfo)
      }

      if (!metaInfo.url) {
        const parsedJsonLink = new URL(r.manifestUrl)
        setInfo({
          iconUrl: metaInfo?.iconUrl || '',
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
        iconUrl: metaInfo.iconUrl || '',
        name: metaInfo.name || '',
        url: metaInfo.url,
        host,
        clientId,
        r,
      })
    }
    getData().then()
  }, [link])

  return info
}
