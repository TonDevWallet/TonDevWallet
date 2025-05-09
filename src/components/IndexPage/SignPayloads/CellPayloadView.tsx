import { SignDataPayloadCell } from '@tonconnect/protocol'
import { memo } from 'react'

export const CellPayloadView = memo(function CellPayloadView({
  payload,
}: {
  payload: SignDataPayloadCell
}) {
  return (
    <div className="p-3 border rounded mb-2">
      <div className="font-medium mb-1">Cell Data</div>
      <div className="text-sm mb-1">Schema: {payload.schema}</div>
      <div className="break-all overflow-hidden text-ellipsis">{payload.cell}</div>
    </div>
  )
})
