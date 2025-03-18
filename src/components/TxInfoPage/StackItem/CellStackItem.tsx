import { StackCell, StackItem } from '@/types/stack'
import { cn } from '@/utils/cn'

export function CellStackItem({ item }: { item: StackCell & StackItem }) {
  return (
    <>
      <div className="break-all font-mono text-sm mb-2">{item.value}</div>

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
