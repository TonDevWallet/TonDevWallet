import { setSelectedWallet, setWalletKey } from '@/store/walletState'
import { Key } from '@/types/Key'
import { State } from '@hookstate/core'
import clsx from 'clsx'
import { useState, useCallback, useEffect } from 'react'
import Jazzicon from 'react-jazzicon'
import { NavLink } from 'react-router-dom'

export function SavedWalletRow({ walletKey }: { walletKey: State<Key> }) {
  const [jazzNumber, setJazzNumber] = useState(0)

  const getJazziconSeed = useCallback(async () => {
    const sd = Buffer.from(walletKey.get().seed || '', 'hex')
    const number = parseInt('0x' + sd.slice(0, 10).toString('hex'))
    console.log('number', number, sd.slice(0, 10))
    setJazzNumber(number)
  }, [walletKey.words])

  useEffect(() => {
    getJazziconSeed()
  }, [])

  // const route = useRoute
  // const isSelected =
  const activeStyle = 'bg-foreground/5'

  return (
    <NavLink
      to={`/wallets/${walletKey.get().id}`}
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
      {jazzNumber ? <Jazzicon diameter={64} seed={jazzNumber} /> : <div className="w-16 h-16" />}

      <div className="text-foreground mt-2">{walletKey.get().name}</div>
    </NavLink>
  )
}
