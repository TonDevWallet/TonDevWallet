import { useLiteclient } from '@/store/liteClient'
import { useTonConnectSessions, deleteTonConnectSession } from '@/store/tonConnect'
import { useWalletListState } from '@/store/walletsListState'
import { getWalletFromKey } from '@/utils/wallets'
import { LiteClient } from 'ton-lite-client'
import { AddressRow } from '../AddressRow'
import { ReactPopup } from '../Popup'
import { Block } from '../ui/Block'
import { BlueButton } from '../ui/BlueButton'

export function SessionsList() {
  const sessions = useTonConnectSessions()
  const keys = useWalletListState()
  const liteClient = useLiteclient() as unknown as LiteClient

  return (
    <div className="gap-2 flex flex-col mb-8">
      <h3 className="text-lg">Sessions:</h3>
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
            // className="dark:bg-foreground/5 bg-background rounded dark:shadow border-2 dark:border-none p-2"
            className="overflow-hidden flex flex-col gap-2"
            key={s.id.get()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <img src={s.iconUrl.get()} alt="icon" className="w-8 h-8 rounded-full" />
                <div className="ml-2">{s.name.get()}</div>
              </div>

              <ReactPopup
                trigger={
                  <button className="cursor-pointer text-accent dark:text-accent-light">
                    &#x1F5D9;
                  </button>
                }
              >
                {(close: () => void) => {
                  return (
                    <div className="flex gap-2">
                      <BlueButton
                        className="bg-red-500"
                        onClick={async () => {
                          await deleteTonConnectSession(s.id.get())
                          close()
                        }}
                        // onClick={async () => {
                        //   await deleteWallet(wallet.id)
                        //   close()
                        // }}
                      >
                        Confirm
                      </BlueButton>
                      <BlueButton className="" onClick={close}>
                        Cancel
                      </BlueButton>
                    </div>
                  )
                }}
              </ReactPopup>
            </div>

            <a href={s.url.get()} target="_blank" className="" rel="noopener noreferrer">
              {s.url.get()}
            </a>

            <div className="flex justify-between">
              <div className="flex">
                <div>WalletInfo:&nbsp;</div>
                <div>{tonWallet?.type}</div>
              </div>
              <div className="flex">
                <div>SubwalletId:&nbsp;</div>
                <div>{tonWallet?.subwalletId || 'Default'}</div>
              </div>
            </div>

            <AddressRow text={<span>Address:</span>} address={tonWallet?.address} />

            {/* <div className="flex items-center">
              <div>Delete:&nbsp;</div>
              <BlueButton
                onClick={() => {
                  deleteTonConnectSession(s.id.get())
                }}
              >
                Delete
              </BlueButton>
            </div> */}
          </Block>
        )
      })}
    </div>
  )
}
