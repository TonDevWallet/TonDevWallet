import { IWallet } from '@/types'
import clsx from 'clsx'
import Jazzicon from 'react-jazzicon'
import { Address } from '@ton/core'

export function WalletJazzicon({
  wallet,
  className,
  diameter = 32,
}: {
  wallet?: IWallet
  className?: string
  diameter?: number
}) {
  const jazzNumber = wallet?.address?.toRaw()?.readUInt32BE(0) || 0
  return (
    <div className={clsx(className, 'flex')}>
      <Jazzicon diameter={diameter} seed={jazzNumber} />
    </div>
  )
}

export function AddressJazzicon({
  address,
  className,
  diameter = 32,
}: {
  address?: Address
  className?: string
  diameter?: number
}) {
  const jazzNumber = address?.toRaw()?.readUInt32BE(0) || 0
  return (
    <div className={clsx(className, 'flex')}>
      <Jazzicon diameter={diameter} seed={jazzNumber} />
    </div>
  )
}
