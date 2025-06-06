import { JettonAmountDisplay, JettonNameDisplay } from '@/components/Jettons/Jettons'
import { Address } from '@ton/ton'
import { memo, useMemo } from 'react'

const JettonFlowItem = memo(function JettonFlowItem({
  jettonAddress,
  amount,
}: {
  jettonAddress: Address | string | undefined
  amount: bigint
}) {
  return (
    <div className="flex items-center">
      <span className="truncate max-w-[200px]">
        <JettonNameDisplay jettonAddress={jettonAddress} />
      </span>
      <div className={`flex ml-2 font-medium ${amount >= 0n ? 'text-green-600' : 'text-red-600'}`}>
        {amount >= 0n ? '+' : ''}
        <JettonAmountDisplay amount={amount} jettonAddress={jettonAddress} />
      </div>
    </div>
  )
})

export const JettonFlow = memo(function JettonFlow({
  jettonTransfers,
  tonDifference,
  ourAddress,
}: {
  jettonTransfers: { from: Address; to: Address; jetton: Address | null; amount: bigint }[]
  ourAddress: Address | null
  tonDifference: bigint
}) {
  // Group transfers by jetton and calculate net flow
  const jettonFlows = useMemo(() => {
    return jettonTransfers.reduce<Record<string, bigint>>((acc, transfer) => {
      const jettonKey = transfer.jetton?.toString() || 'unknown'
      if (!acc[jettonKey]) {
        acc[jettonKey] = 0n
      }

      // Add to balance if receiving tokens (to our address)
      // Subtract from balance if sending tokens (from our address)
      if (ourAddress && transfer.to.equals(ourAddress)) {
        acc[jettonKey] += transfer.amount
      } else if (ourAddress && transfer.from.equals(ourAddress)) {
        acc[jettonKey] -= transfer.amount
      }

      return acc
    }, {})
  }, [jettonTransfers, ourAddress?.toRawString()])

  return (
    <div className="mt-2">
      <div className="font-semibold mb-1">Money Flow:</div>
      {Object.entries(jettonFlows).length > 0 ? (
        Object.entries(jettonFlows).map(([jettonAddr, amount]) => (
          <JettonFlowItem key={jettonAddr} jettonAddress={jettonAddr} amount={amount} />
        ))
      ) : (
        <></>
      )}
      <JettonFlowItem jettonAddress={'TON'} amount={tonDifference} />
    </div>
  )
})
