import { useLiteclient } from '@/store/liteClient'
import {
  useTonConnectSessions,
  deleteTonConnectSession,
  setTonConnectSessionAutoSend,
} from '@/store/tonConnect'
import { useWalletListState } from '@/store/walletsListState'
import { setWalletKey, setSelectedWallet } from '@/store/walletState'
import { getWalletFromKey } from '@/utils/wallets'
import { faClose, faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { NavLink } from 'react-router-dom'
import { LiteClient } from 'ton-lite-client'
import { AddressRow } from '../AddressRow'
import { KeyJazzicon } from '../KeyJazzicon'
import { Block } from '../ui/Block'
import { WalletJazzicon } from '../WalletJazzicon'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function SessionsList() {
  const sessions = useTonConnectSessions()
  const keys = useWalletListState()
  const liteClient = useLiteclient() as unknown as LiteClient

  return (
    <div className="mb-8 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg shadow-md">
      {sessions.map((s) => {
        const key = keys.find((k) => k.id.get() === s.keyId.get())
        if (!key) {
          return <></>
        }

        const wallet = key.wallets.get()?.find((w) => w.id === s.walletId.get())
        if (!wallet) {
          return <></>
        }

        const tonWallet = getWalletFromKey(liteClient, key.get(), wallet)

        return (
          <Block
            // className="dark:bg-foreground/5 bg-background rounded dark:shadow border-2 dark:border-none p-2"
            className="overflow-hidden flex flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md"
            key={s.id.get()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <img src={s.iconUrl.get()} alt="icon" className="w-8 h-8 rounded-full" />
                <div className="ml-2 text-gray-700 dark:text-gray-300">{s.name.get()}</div>
                <FontAwesomeIcon icon={faPlus} className="mx-1 text-gray-700 dark:text-gray-300" />

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

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  {/* <Button variant="outline" onClick={(e) => {}}> */}
                  {/* <div> */}
                  <Button
                    variant={'ghost'}
                    className={'px-2'}
                    // className="cursor-pointer text-accent dark:text-accent-light"
                    onClick={async (e) => {
                      if (e.ctrlKey) {
                        e.preventDefault()
                        e.stopPropagation()
                        deleteTonConnectSession(s)
                      }
                    }}
                  >
                    <FontAwesomeIcon icon={faClose} className="mx-1" />
                  </Button>
                  {/* </div> */}
                  {/* </Button> */}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your session will be deleted, and will disconnect from service
                    </AlertDialogDescription>
                    <AlertDialogDescription>
                      To close session without confirm popup use Ctrl + Click
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteTonConnectSession(s)}>
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <a href={s.url.get()} target="_blank" className="text-blue-500 dark:text-blue-300" rel="noopener noreferrer">
              {s.url.get()}
            </a>

            <div className="flex justify-between text-gray-700 dark:text-gray-300">
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
              text={<span className="w-24 flex-shrink-0 text-gray-700 dark:text-gray-300">Address:</span>}
              address={tonWallet?.address}
            />

            <div className="flex cursor-pointer items-center">
              <input
                type="checkbox"
                id={`autosend_input_${s.id.get()}`}
                className="w-4 h-4 accent-highlight"
                checked={s.autoSend.get()}
                onChange={(e) => {
                  setTonConnectSessionAutoSend({ session: s, autoSend: e.target.checked })
                }}
              />
              <label
                htmlFor={`autosend_input_${s.id.get()}`}
                className="w-full ml-2 cursor-pointer text-gray-700 dark:text-gray-300"
              >
                Send without confirmation?
              </label>
            </div>
          </Block>
        )
      })}
    </div>
  )
}
