import { StackTuple } from '@/types/stack'
import { StackItemComponent } from './StackItem'
import { useMemo } from 'react'

export function TupleStackItem({ item }: { item: StackTuple }) {
  const items = useMemo(() => {
    return item.items.map((i, id) => ({
      ...i,
      index: id,
    }))
  }, [item.items])

  return (
    <>
      {items.map((i) => (
        <StackItemComponent key={i.index} item={i} index={i.index || 0} />
      ))}
    </>
  )
}
