import clipboard from 'clipboardy'
import { ReactNode, useState } from 'react'
import { Address } from 'ton-core'

import CopySvg from './icons/copy'
import DoneSvg from './icons/done'

export function AddressRow({
  address,
  text,
  rawAddress,
}: {
  address?: string | Address
  text?: string | ReactNode | undefined
  rawAddress?: string
}) {
  const [copied, setCopied] = useState(false)

  let addressString
  if (rawAddress) {
    addressString = Address.parse(rawAddress).toString({ urlSafe: true, bounceable: true })
  } else if (address) {
    addressString =
      typeof address === 'string' ? address : address.toString({ urlSafe: true, bounceable: true })
  }

  const pressCopy = () => {
    clipboard.write(addressString)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 1000)
  }

  return (
    <div className="flex justify-start items-center cursor-pointer" onClick={pressCopy}>
      {text && (typeof text === 'string' ? <div>{text}</div> : text)}
      {/* <div className="">{text}</div> */}
      <div className="text-xs overflow-hidden text-ellipsis whitespace-nowrap">
        {addressString.substring(0, addressString.length - 4)}
      </div>
      <div className="text-xs mr-4 w-10">{addressString.substring(addressString.length - 4)}</div>

      <div className="ml-auto flex items-center">
        <button className="w-6 h-6">{copied ? <DoneSvg /> : <CopySvg />}</button>
      </div>
    </div>
  )
}
