import { SignDataPayloadBinary } from '@tonconnect/protocol'
import { memo } from 'react'

export const BinaryPayloadView = memo(function BinaryPayloadView({
  payload,
}: {
  payload: SignDataPayloadBinary
}) {
  return (
    <div className="p-3 border rounded mb-2">
      <div className="font-medium mb-1">Binary Data</div>
      <div className="break-all overflow-hidden text-ellipsis">{payload.bytes}</div>
    </div>
  )
})
