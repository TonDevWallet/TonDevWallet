import { cn } from '@/utils/cn'
import clipboard from 'clipboardy'
import clsx from 'clsx'
import { ReactNode, useState } from 'react'
import { Address, ExternalAddress } from '@ton/core'

import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export function AddressRow({
  address,
  text,
  rawAddress,

  addressClassName,
  containerClassName,
  disableCopy,
}: {
  address?: string | Address | ExternalAddress
  text?: string | ReactNode | undefined
  rawAddress?: string

  addressClassName?: string
  containerClassName?: string
  disableCopy?: boolean
}) {
  const [copied, setCopied] = useState(false)

  let addressString: string = ''
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
    <div
      className={cn('flex justify-start items-center cursor-pointer', containerClassName)}
      onClick={pressCopy}
    >
      {text && (typeof text === 'string' ? <div>{text}</div> : text)}
      {/* <div className="">{text}</div> */}
      <div
        className={clsx(
          'text-xs overflow-hidden text-ellipsis whitespace-nowrap',
          addressClassName
        )}
      >
        {addressString.substring(0, addressString.length - 4)}
      </div>
      <div className={clsx('text-xs mr-4 w-10', addressClassName)}>
        {addressString.substring(addressString.length - 4)}
      </div>

      {!disableCopy && (
        <div className="ml-auto flex items-center">
          <button className="w-5 h-5">
            {copied ? <FontAwesomeIcon icon={faCheck} /> : <FontAwesomeIcon icon={faCopy} />}
          </button>
        </div>
      )}
    </div>
  )
}
