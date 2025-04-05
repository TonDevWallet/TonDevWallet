import { StackInt } from '@/types/stack'
import { formatUnits } from '@/utils/units'
import Copier from '@/components/copier'

export function IntegerStackItem({ item }: { item: StackInt }) {
  let bigValue: bigint
  try {
    bigValue = BigInt(item.value)
  } catch (error) {
    console.log('IntegerStackItem error', item, error)
    return null
  }
  const isNegative = bigValue < 0n
  const absValue = isNegative ? -bigValue : bigValue
  return (
    <div className="space-y-2">
      <div className="break-all font-mono text-sm">
        <div className="text-xs text-muted-foreground mb-1">Decimal:</div>
        <div className="flex items-center">
          <input
            className="flex-1 font-mono text-sm bg-transparent border-none outline-none p-0 text-foreground"
            readOnly
            value={item.value}
          />
          <Copier text={item.value} className="w-5 h-5 ml-2" />
        </div>
      </div>
      <div className="break-all font-mono text-sm">
        <div className="text-xs text-muted-foreground mb-1">Hex:</div>
        <div className="flex items-center">
          <input
            className="flex-1 font-mono text-sm bg-transparent border-none outline-none p-0 text-foreground"
            readOnly
            value={`${isNegative ? '-' : ''}0x${absValue.toString(16)}`}
          />
          <Copier
            text={`${isNegative ? '-' : ''}0x${absValue.toString(16)}`}
            className="w-5 h-5 ml-2"
          />
        </div>
      </div>
      <div className="break-all font-mono text-sm">
        <div className="text-xs text-muted-foreground mb-1">Binary:</div>
        <div className="flex items-center">
          <input
            className="flex-1 font-mono text-sm bg-transparent border-none outline-none p-0 text-foreground"
            readOnly
            value={`${isNegative ? '-' : ''}0b${absValue.toString(2)}`}
          />
          <Copier
            text={`${isNegative ? '-' : ''}0b${absValue.toString(2)}`}
            className="w-5 h-5 ml-2"
          />
        </div>
      </div>
      {
        <div className="break-all font-mono text-sm">
          <div className="text-xs text-muted-foreground mb-1">TON:</div>
          <div className="flex items-center">
            <input
              className="flex-1 font-mono text-sm bg-transparent border-none outline-none p-0 text-foreground"
              readOnly
              value={`${formatUnits(BigInt(item.value), 9)} TON`}
            />
            <Copier text={`${formatUnits(BigInt(item.value), 9)} TON`} className="w-5 h-5 ml-2" />
          </div>
        </div>
      }
    </div>
  )
}
