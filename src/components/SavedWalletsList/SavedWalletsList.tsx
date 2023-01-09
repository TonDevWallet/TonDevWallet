import { SavedWalletRow } from './SavedWalletRow'
import { suspend } from '@hookstate/core'
import { useWalletListState } from '@/store/walletsListState'
import { NavLink } from 'react-router-dom'
import { BlueButton } from '../UI'
import { getDatabase } from '@/db'
import { ImportMigrations } from '@/utils/getMigrations'

export function SavedWalletsList() {
  const wallets = useWalletListState()

  return (
    suspend(wallets) || (
      <div className="p-2">
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
            <SavedWalletRow walletKey={dbWallet.get()} key={dbWallet.get().id} />
          ))}

        <NavLink
          to="/new_wallet"
          className={({ isActive }) =>
            'cursor-pointer rounded p-1 flex flex-col items-center my-2 ' +
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

        <BlueButton
          onClick={async () => {
            const db = await getDatabase()
            await db.migrate.down({
              migrationSource: new ImportMigrations(),
            })
          }}
        >
          Migrate back
        </BlueButton>
      </div>
    )
  )
}
