import { Key } from '@/types/Key'
import { State } from '@hookstate/core'
import clsx from 'clsx'
import Jazzicon from 'react-jazzicon'

export function KeyJazzicon({
  walletKey,
  className,
  diameter = 64,
}: {
  walletKey: State<Key>
  className?: string
  diameter?: number
}) {
  const buffer = Buffer.from(walletKey?.seed?.get() || '', 'hex')
  const jazzNumber = buffer.length >= 4 ? buffer.readUint32BE(0) : 0 // key..toRaw().readUint32BE(0)
  return (
    <div className={clsx(className, 'flex')}>
      <Jazzicon diameter={diameter} seed={jazzNumber} />
    </div>
  )
}