import clipboard from 'clipboardy'
import { useState } from 'react'

import CopySvg from './icons/copy'
import DoneSvg from './icons/done'

export function AddressRow({ address, text }: { address: string; text: string }) {
  const [copied, setCopied] = useState(false)

  const pressCopy = () => {
    clipboard.write(address)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 1000)
  }

  return (
    <div className="flex justify-start items-center cursor-pointer" onClick={pressCopy}>
      <div className="">{text}</div>
      <div className="text-xs overflow-hidden text-ellipsis whitespace-nowrap">
        {address.substring(0, address.length - 4)}
      </div>
      <div className="text-xs mr-4">{address.substring(address.length - 4)}</div>

      <div className="ml-auto">
        <button className="w-6 h-6">{copied ? <DoneSvg /> : <CopySvg />}</button>
      </div>
    </div>
  )
}
