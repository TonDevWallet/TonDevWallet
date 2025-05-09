import { SignDataPayloadText } from '@tonconnect/protocol'
import { memo } from 'react'

export const TextPayloadView = memo(function TextPayloadView({
  payload,
}: {
  payload: SignDataPayloadText
}) {
  return (
    <div className="p-3 border rounded mb-2">
      <div className="font-medium mb-1">Text Message</div>
      <div className="break-all">{payload.text}</div>
    </div>
  )
})
