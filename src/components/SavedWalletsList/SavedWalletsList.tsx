import { SavedWalletRow } from './SavedWalletRow'
import { suspend } from '@hookstate/core'
import { useWalletListState } from '@/store/walletsListState'
import { NavLink } from 'react-router-dom'
import { changeLiteClient, useLiteclient, useLiteclientState } from '@/store/liteClient'
import { useTonConnectSessions } from '@/store/tonConnect'
import { sendTonConnectStartMessage } from '../TonConnect/TonConnect'
import nacl from 'tweetnacl'
import { getWalletFromKey } from '@/utils/wallets'
import { KeyPair } from 'ton-crypto'
import { LiteClient } from 'ton-lite-client'
import { IWallet } from '@/types'

export function SavedWalletsList() {
  const keys = useWalletListState()
  const liteClientState = useLiteclientState()
  const sessions = useTonConnectSessions()
  const liteClient = useLiteclient() as LiteClient

  const changeLiteClientNetwork = () => {
    changeLiteClient(!liteClientState.testnet.get())
    for (const s of sessions.get()) {
      const key = keys.find((k) => k.id.get() === s.keyId)
      if (!key) {
        return
      }

      const wallet = key.wallets.get()?.find((w) => w.id === s.walletId)
      if (!wallet) {
        return
      }

      const sessionKeyPair = nacl.box.keyPair.fromSecretKey(s.secretKey) as KeyPair

      const tonWallet = getWalletFromKey(liteClient, key, wallet) as IWallet

      const serviceUrl = new URL(s.url)
      const host = serviceUrl.host

      sendTonConnectStartMessage(tonWallet, host, sessionKeyPair, s.userId)
    }
  }

  return (
    suspend(keys) || (
      <div className="p-2">
        <div className="cursor-pointer rounded p-1 flex flex-col items-center my-2">
          <label
            className="rounded-full w-16 h-16 bg-foreground-element/5
            flex flex-col items-center justify-center text-sm"
            htmlFor="apiKeyInput"
          >
            {/* <label>Testnet:</label> */}
            <div>Testnet:</div>
            <input
              className="bg-foreground-element/5 rounded"
              type="checkbox"
              id="apiKeyInput"
              checked={liteClientState.testnet.get()}
              onChange={changeLiteClientNetwork}
            />
          </label>
        </div>

        {/* <div className="cursor-pointer rounded p-1 flex flex-col items-center my-2">
          <label
            className="rounded-full w-16 h-16 bg-gray-300
            flex flex-col items-center justify-center text-sm"
            htmlFor="apiKeyInput"
          >
            <div>Listeners: {sessions.length}</div>
          </label>
        </div> */}

        <NavLink
          to="/"
          className={({ isActive }) =>
            'cursor-pointer rounded p-1 flex flex-col items-center my-2 ' +
            (isActive ? 'bg-foreground-element/5' : '')
          }
        >
          <div
            className="rounded-full w-16 h-16 bg-foreground-element/5
            flex items-center justify-center text-[32px]"
          >
            /
          </div>
          <div>Home</div>
        </NavLink>

        {keys &&
          keys.map((dbWallet) => <SavedWalletRow walletKey={dbWallet} key={dbWallet.get().id} />)}

        <NavLink
          to="/new_wallet"
          className={({ isActive }) =>
            'cursor-pointer rounded p-1 flex flex-col items-center my-2 text-center ' +
            (isActive ? 'bg-foreground-element/5' : '')
          }
        >
          <div
            className="rounded-full w-16 h-16 bg-foreground-element/5
            flex items-center justify-center text-[32px]"
          >
            +
          </div>
          <div>New wallet</div>
        </NavLink>

        {/* <BlueButton
          onClick={async () => {
            const db = await getDatabase()
            await db.migrate.down({
              migrationSource: new ImportMigrations(),
            })
          }}
        >
          Migrate back
        </BlueButton> */}
      </div>
    )
  )
}
