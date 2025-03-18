import { AddressRow } from '@/components/AddressRow'
import { StackItem, StackSlice } from '@/types/stack'
import { cn } from '@/utils/cn'
import { beginCell } from '@ton/core'
import { useMemo } from 'react'

export function SliceStackItem({ item }: { item: StackSlice & StackItem }) {
  const addressFromSlice = useMemo(() => {
    const bitLen = item.bits[1] - item.bits[0]
    if (bitLen !== 267) {
      return undefined
    }

    try {
      const bitsBuffer = Buffer.from(item.value, 'hex')
      const itemCell = beginCell().storeBuffer(bitsBuffer).endCell()
      const reader = itemCell.beginParse()
      reader.skip(item.bits[0] + 16)
      const address = reader.loadAddress()
      return address
    } catch (e) {
      console.log('Address loading error', e)
    }

    return undefined
  }, [item])

  return (
    <>
      <div className="break-all font-mono text-sm mb-2">{item.value}</div>

      {addressFromSlice && (
        <div>
          <AddressRow address={addressFromSlice} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-1 text-xs mt-2">
        <div
          className={cn('flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded', {
            'bg-green-500/10 border-green-500/30 dark:bg-green-500/10 dark:border-green-500/30':
              item.added,
            'bg-destructive/70 border-destructive/70 dark:bg-destructive/70 dark:border-destructive/70':
              item.removed,
          })}
        >
          <span className="text-slate-500 dark:text-slate-400">Bits:</span>
          <span className="">
            {item.bits[0]}..{item.bits[1]}
          </span>
        </div>
        <div
          className={cn('flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded', {
            'bg-green-500/10 border-green-500/30 dark:bg-green-500/10 dark:border-green-500/30':
              item.added,
            'bg-destructive/70 border-destructive/70 dark:bg-destructive/70 dark:border-destructive/70':
              item.removed,
          })}
        >
          <span className="text-slate-500 dark:text-slate-400">Refs:</span>
          <span className="">
            {item.refs[0]}..{item.refs[1]}
          </span>
        </div>
      </div>
    </>
  )
}
