import { useLiteclient } from '@/store/liteClient'
import { useTonConnectSessions, deleteTonConnectSession } from '@/store/tonConnect'
import { useWalletListState } from '@/store/walletsListState'
import { setWalletKey, setSelectedWallet } from '@/store/walletState'
import { getWalletFromKey } from '@/utils/wallets'
import { faClose, faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { NavLink } from 'react-router-dom'
import { LiteClient } from 'ton-lite-client'
import { AddressRow } from '../AddressRow'
import { KeyJazzicon } from '../KeyJazzicon'
import { ReactPopup } from '../Popup'
import { Block } from '../ui/Block'
import { BlueButton } from '../ui/BlueButton'
import { WalletJazzicon } from '../WalletJazzicon'

export function SessionsList() {
  const sessions = useTonConnectSessions()
  const keys = useWalletListState()
  const liteClient = useLiteclient() as unknown as LiteClient

  return (
    <div className="gap-2 flex flex-col mb-8">
      <div className="flex justify-between">
        <h3 className="text-lg">Active Sessions:</h3>
      </div>
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
                <FontAwesomeIcon icon={faPlus} className="mx-1" />

                <NavLink
                  className="flex"
                  to={`/app/wallets/${key.id.get()}`}
                  onClick={() => {
                    setWalletKey(key.id.get())
                    setSelectedWallet(tonWallet)
                  }}
                >
                  <KeyJazzicon walletKey={key} diameter={32} alt={key.name.get()} />
                  <WalletJazzicon wallet={tonWallet} className="-ml-2" />
                </NavLink>
              </div>

              <ReactPopup
                trigger={() => (
                  <div>
                    <button
                      className="cursor-pointer text-accent dark:text-accent-light"
                      onClick={async (e) => {
                        if (e.ctrlKey) {
                          e.preventDefault()
                          e.stopPropagation()
                          deleteTonConnectSession(s)
                        }
                      }}
                    >
                      <FontAwesomeIcon icon={faClose} className="mx-1" />
                    </button>
                  </div>
                )}
              >
                {(close: () => void) => {
                  return (
                    <div className="flex flex-col gap-2 p-2">
                      <p>To close session without confirm popup use Ctrl + Click</p>
                      <div className="flex gap-2">
                        <BlueButton
                          className="bg-red-500"
                          onClick={async () => {
                            await deleteTonConnectSession(s)
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
                <div>Type:&nbsp;</div>
                <div>{tonWallet?.type}</div>
              </div>
              <div className="flex">
                <div>SubId:&nbsp;</div>
                <div>{tonWallet?.subwalletId || 'Default'}</div>
              </div>
            </div>

            <AddressRow
              text={<span className="w-24 flex-shrink-0">Address:</span>}
              address={tonWallet?.address}
            />

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
