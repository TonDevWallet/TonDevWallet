import { StackItem } from '@/types/stack'
import { cn } from '@/utils/cn'
import { IntegerStackItem } from './IntegerStackItem'
import { CellStackItem } from './CellStackItem'
import { SliceStackItem } from './SliceStackItem'
import { ContStackItem } from './ContStackItem'
import { useMemo } from 'react'
import { SliceBuilderItem } from './SliceBuilderItem'
import { TupleStackItem } from './TupleStackItem'

export function StackItemComponent({ item, index }: { item: StackItem; index: number }) {
  const cardType = useMemo(() => {
    if (item._ === 'int') {
      return 'Integer'
    }

    if (item._ === 'cell') {
      return 'Cell'
    }

    if (item._ === 'slice') {
      return 'Slice'
    }

    if (item._ === 'cont') {
      return 'Cont'
    }

    if (item._ === 'builder') {
      return 'Builder'
    }

    if (item._ === 'tuple') {
      return 'Tuple'
    }

    return 'Unknown'
  }, [item])

  return (
    <div
      className={cn('mb-3 rounded-lg border overflow-hidden', {
        'bg-green-500/10 border-green-500/30': item.added,
        'bg-destructive/70 border-destructive/70': item.removed,
        'bg-background border-border': !item.added && !item.removed,
      })}
    >
      <div
        className={cn('p-2 border-b border-border bg-secondary flex justify-between items-center', {
          'bg-green-500/10 border-green-500/30': item.added,
          'bg-destructive/70 border-destructive/70': item.removed,
        })}
      >
        <div className="text-sm">#{index}</div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-medium px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
            {cardType}
          </div>
        </div>
      </div>

      <div className="p-3">
        {item._ === 'int' && <IntegerStackItem item={item} />}
        {item._ === 'cell' && <CellStackItem item={item} />}
        {item._ === 'slice' && <SliceStackItem item={item} />}
        {item._ === 'cont' && <ContStackItem />}
        {item._ === 'builder' && <SliceBuilderItem item={item} />}
        {item._ === 'tuple' && <TupleStackItem item={item} />}
      </div>
    </div>
  )
}
