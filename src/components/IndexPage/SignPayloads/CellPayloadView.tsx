import { SignDataPayloadCell } from '@tonconnect/protocol'
import { memo, useMemo } from 'react'
import { parseTLB } from '@/tlb-runtime'

export const CellPayloadView = memo(function CellPayloadView({
  payload,
}: {
  payload: SignDataPayloadCell
}) {
  const parsedTlb = useMemo(() => {
    try {
      return JSON.stringify(parseTLB(payload.schema).deserialize(payload.cell), null, 2)
    } catch (error) {
      console.error(error)
      return null
    }
  }, [payload.schema])
  return (
    <div className="p-3 border rounded mb-2">
      <div className="font-medium mb-1">Cell Data</div>
      <div className="text-sm mb-1">Schema: {payload.schema}</div>
      <div className="break-all overflow-hidden text-ellipsis">{payload.cell}</div>
      {parsedTlb ? (
        <div>Parsed: {parsedTlb}</div>
      ) : (
        <div className="text-red-500">Failed to parse</div>
      )}
    </div>
  )
})
