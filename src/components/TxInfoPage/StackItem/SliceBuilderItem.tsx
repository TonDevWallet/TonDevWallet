import { StackBuilder } from '@/types/stack'

export function SliceBuilderItem({ item }: { item: StackBuilder }) {
  return (
    <>
      <div className="break-all font-mono text-sm mb-2">{item.value}</div>
    </>
  )
}
