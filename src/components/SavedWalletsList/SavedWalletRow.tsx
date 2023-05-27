import { setSelectedWallet, setWalletKey } from '@/store/walletState'
import { Key } from '@/types/Key'
import { State } from '@hookstate/core'
import clsx from 'clsx'
import { NavLink } from 'react-router-dom'
import { KeyJazzicon } from '../KeyJazzicon'

export function SavedWalletRow({ walletKey }: { walletKey: State<Key> }) {
  const activeStyle = 'bg-foreground/5'

  return (
    <NavLink
      to={`/app/wallets/${walletKey.get().id}`}
      className={({ isActive }) =>
        clsx(
          'rounded p-1 flex flex-col items-center my-2 select-none text-foreground ',
          isActive ? activeStyle : ''
        )
      }
      onClick={() => {
        setWalletKey(walletKey.get().id)
        setSelectedWallet(null)
      }}
    >
      <KeyJazzicon walletKey={walletKey} />

      <div className="text-foreground mt-2 text-center">{walletKey.get().name}</div>
    </NavLink>
  )
}
