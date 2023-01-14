import { SavedWalletRow } from './SavedWalletRow'
import { suspend } from '@hookstate/core'
import { useWalletListState } from '@/store/walletsListState'
import { NavLink } from 'react-router-dom'
import { changeLiteClient, useLiteclientState } from '@/store/liteClient'

export function SavedWalletsList() {
  const wallets = useWalletListState()
  const liteClientState = useLiteclientState()

  return (
    suspend(wallets) || (
      <div className="p-2">
        <div className="cursor-pointer rounded p-1 flex flex-col items-center my-2">
          <label
            className="rounded-full w-16 h-16 bg-gray-300
            flex flex-col items-center justify-center text-sm"
            htmlFor="apiKeyInput"
          >
            {/* <label>Testnet:</label> */}
            <div>Testnet:</div>
            <input
              className="bg-gray-200 rounded"
              type="checkbox"
              id="apiKeyInput"
              checked={liteClientState.testnet.get()}
              onChange={(e) => {
                console.log('e', e.target.value)
                changeLiteClient(!liteClientState.testnet.get())
              }}
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
            (isActive ? 'bg-gray-200' : '')
          }
        >
          <div
            className="rounded-full w-16 h-16 bg-gray-300
            flex items-center justify-center text-[32px]"
          >
            /
          </div>
          <div>Home</div>
        </NavLink>

        {wallets &&
          wallets.map((dbWallet) => (
            <SavedWalletRow walletKey={dbWallet} key={dbWallet.get().id} />
          ))}

        <NavLink
          to="/new_wallet"
          className={({ isActive }) =>
            'cursor-pointer rounded p-1 flex flex-col items-center my-2 text-center' +
            (isActive ? 'bg-gray-200' : '')
          }
        >
          <div
            className="rounded-full w-16 h-16 bg-gray-300
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
