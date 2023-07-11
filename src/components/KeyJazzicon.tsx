import { Key } from '@/types/Key'
import { State } from '@hookstate/core'
import clsx from 'clsx'
import Jazzicon from 'react-jazzicon'

export function KeyJazzicon({
  walletKey,
  className,
  diameter = 64,
  alt,
}: {
  walletKey: State<Key>
  className?: string
  diameter?: number
  alt?: string
}) {
  const buffer = Buffer.from(walletKey?.public_key?.get() || '', 'base64')
  const jazzNumber = buffer.length >= 4 ? buffer.readUInt32BE(0) : 0 // key..toRaw().readUint32BE(0)
  return (
    <div className={clsx(className, 'flex')} title={alt}>
      <Jazzicon diameter={diameter} seed={jazzNumber} />
    </div>
  )
}
