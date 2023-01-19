import { useLiteclient } from '@/store/liteClient'
import { useTonConnectSessions, deleteTonConnectSession } from '@/store/tonConnect'
import { useWalletListState } from '@/store/walletsListState'
import { getWalletFromKey } from '@/utils/wallets'
import { LiteClient } from 'ton-lite-client'
import { Block } from '../ui/Block'
import { BlueButton } from '../ui/BlueButton'

export function SessionsList() {
  const sessions = useTonConnectSessions()
  const keys = useWalletListState()
  const liteClient = useLiteclient() as unknown as LiteClient

  return (
    <div className="gap-2 flex flex-col">
      <h3 className="text-lg mb-2 text-accent">Sessions:</h3>
      {sessions.map((s) => {
        const key = keys.find((k) => k.id.get() === s.keyId.get())
        if (!key) {
          return <></>
        }

        const wallet = key.wallets.get()?.find((w) => w.id === s.walletId.get())
        if (!wallet) {
          return <></>
        }

        const tonWallet = getWalletFromKey(liteClient, key, wallet)

        return (
          <Block
            // className="dark:bg-foreground-element/5 bg-background rounded dark:shadow border-2 dark:border-none p-2"
            className="overflow-hidden"
            key={s.id.get()}
          >
            <div className="flex items-center">
              <img src={s.iconUrl.get()} alt="icon" className="w-8 h-8 rounded-full" />
              <div className="ml-2">{s.name.get()}</div>
              <a href={s.url.get()} target="_blank" className="ml-2" rel="noopener noreferrer">
                {s.url.get()}
              </a>
            </div>

            <div className="flex">
              <div>WalletInfo:&nbsp;</div>
              <div>{tonWallet?.type}</div>
            </div>
            <div className="flex">
              <div>SubwalletId:&nbsp;</div>
              <div>{tonWallet?.subwalletId || 'Default'}</div>
            </div>

            <div className="flex">
              <div>Address:&nbsp;</div>
              <div>{tonWallet?.address.toString()}</div>
            </div>

            <div className="flex items-center">
              <div>Delete:&nbsp;</div>
              <BlueButton
                onClick={() => {
                  deleteTonConnectSession(s.id.get())
                }}
              >
                Delete
              </BlueButton>
            </div>
          </Block>
        )
      })}
    </div>
  )
}
