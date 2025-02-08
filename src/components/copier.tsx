import clipboard from 'clipboardy'
import { useState } from 'react'

import CopySvg from './icons/copy'
import DoneSvg from './icons/done'

export default function Copier({
  text,
  className = 'w-6 h-6',
  style,
}: {
  text: string
  className?: string
  style?: React.CSSProperties
}) {
  const [copied, setCopied] = useState(false)

  const pressCopy = () => {
    clipboard.write(text)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 1000)
  }

  return (
    <button className={className} onClick={pressCopy} style={style}>
      {copied ? <DoneSvg /> : <CopySvg className="text-red" />}
    </button>
  )
}
