import { setSelectedWallet, setWalletKey, useWallet } from '@/store/walletState'
import { Key } from '@/types/Key'
import { State } from '@hookstate/core'
import { useState, useCallback, useEffect } from 'react'
import Jazzicon from 'react-jazzicon'
import { NavLink } from 'react-router-dom'

export function SavedWalletRow({ walletKey }: { walletKey: State<Key> }) {
  const wallet = useWallet()
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

  console.log('wallet id', walletKey.id, wallet.key.get()?.id)

  // const route = useRoute
  // const isSelected =
  const activeStyle = 'bg-gray-200'

  return (
    <NavLink
      to={`/wallets/${walletKey.get().id}`}
      className={({ isActive }) =>
        'rounded p-1 flex flex-col items-center my-2 select-none ' + (isActive ? activeStyle : '')
      }
      onClick={() => {
        setWalletKey(walletKey.get().id)
        setSelectedWallet(null)
      }}
    >
      {jazzNumber ? <Jazzicon diameter={64} seed={jazzNumber} /> : <div className="w-16 h-16" />}

      <div>{walletKey.get().name}</div>
    </NavLink>
  )
}
