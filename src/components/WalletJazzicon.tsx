import { IWallet } from '@/types'
import clsx from 'clsx'
import Jazzicon from 'react-jazzicon'

export function WalletJazzicon({
  wallet,
  className,
  diameter = 32,
}: {
  wallet?: IWallet
  className?: string
  diameter?: number
}) {
  const jazzNumber = wallet?.address?.toRaw()?.readUint32BE(0) || 0
  return (
    <div className={clsx(className, 'flex')}>
      <Jazzicon diameter={diameter} seed={jazzNumber} />
    </div>
  )
}
