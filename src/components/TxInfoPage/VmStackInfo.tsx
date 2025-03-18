import { useMemo } from 'react'
import { StackInfo } from './TxInfoPage'
import { diffLines } from 'diff'
import { cn } from '@/utils/cn'

interface StackInt {
  _: 'int'
  value: string
}

interface StackCell {
  _: 'cell'
  value: string
  bits: [number, number]
  refs: [number, number]
}

interface StackSlice {
  _: 'slice'
  value: string
  bits: [number, number]
  refs: [number, number]
}

type StackItem = {
  added?: boolean
  removed?: boolean
} & (StackInt | StackCell | StackSlice)

function stackItemToText(item: StackItem) {
  if (item._ === 'int') {
    return item.value
  }

  return item.value + `[${item.bits[0]}..${item.bits[1]}]` + `[${item.refs[0]}..${item.refs[1]}]`
}

function getStackInfo(stackData: string) {
  const lines = stackData.split(' ')
  const res: StackItem[] = []
  let i = 1
  while (i < lines.length - 2) {
    const l = lines[i]
    if (l.startsWith('CS{')) {
      const bits = lines[i + 2].replace(';', '').split('..')
      const refs = lines[i + 4].replace('}', '').split('..')

      res.push({
        _: 'slice',
        value: l.slice(8, -1),
        bits: [parseInt(bits[0]), parseInt(bits[1])],
        refs: [parseInt(refs[0]), parseInt(refs[1])],
      })
      i += 5
    } else if (l.startsWith('C{')) {
      res.push({
        _: 'cell',
        value: l.slice(2, -1),
        bits: [0, 0],
        refs: [0, 0],
      })
      i++
    } else if (l.startsWith('[CS{Cell{')) {
      const bits = lines[i + 2].replace(';', '').split('..')
      const refs = lines[i + 4].replace('}', '').split('..')
      res.push({
        _: 'cell',
        value: l.slice(0, -1),
        bits: [parseInt(bits[0]), parseInt(bits[1])],
        refs: [parseInt(refs[0]), parseInt(refs[1])],
      })
      i += 7
    } else {
      res.push({
        _: 'int',
        value: l,
      })
      i++
    }
  }

  return res
}

export function VmStackInfo({ stack }: { stack: StackInfo }) {
  const oldStackInfo = useMemo(() => {
    return getStackInfo(stack.old)
  }, [stack.old])
  const newStackInfo = useMemo(() => {
    return getStackInfo(stack.new)
  }, [stack.new])

  const stackDiff = useMemo(() => {
    const diffForward = diffLines(
      oldStackInfo.map((r) => stackItemToText(r)).join('\n'),
      newStackInfo.map((r) => stackItemToText(r)).join('\n')
    )

    const diffBackward = diffLines(
      newStackInfo.map((r) => stackItemToText(r)).join('\n'),
      oldStackInfo.map((r) => stackItemToText(r)).join('\n')
    )

    const diffForwardLines = diffForward
      .map((r) => {
        const lines = r.value.split('\n')
        return lines.map((line) => {
          return {
            added: r.added,
            removed: r.removed,
            value: line,
          }
        })
      })
      .flat()
      .filter((v) => !!v.value)

    const diffBackwardLines = diffBackward
      .map((r) => {
        const lines = r.value.split('\n')
        return lines.map((line) => {
          return {
            added: r.added,
            removed: r.removed,
            value: line,
          }
        })
      })
      .flat()
      .filter((v) => !!v.value)

    const oldStackWithDiff: StackItem[] = []
    for (let i = 0; i < oldStackInfo.length; i++) {
      const old = oldStackInfo[i]
      const oldText = stackItemToText(old)
      const diff = diffBackwardLines.slice(i).find((v) => v.value === oldText)

      oldStackWithDiff.push({
        ...old,
        added: false,
        removed: diff?.added,
      })
    }

    const newStackWithDiff: StackItem[] = []
    for (let i = 0; i < newStackInfo.length; i++) {
      const newItem = newStackInfo[i]
      const newText = stackItemToText(newItem)
      const diff = diffForwardLines.slice(i).find((v) => v.value === newText)

      newStackWithDiff.push({
        ...newItem,
        added: diff?.added,
        removed: false,
      })
    }

    return {
      oldStackWithDiff,
      newStackWithDiff,
    }
  }, [oldStackInfo, newStackInfo])

  console.log(stackDiff)
  return (
    <>
      <StackList stack={stackDiff.oldStackWithDiff} />
      <StackList stack={stackDiff.newStackWithDiff} />
    </>
  )
}

function StackList({ stack }: { stack: StackItem[] }) {
  return (
    <div className="relative h-full overflow-hidden border-l">
      <div
        className={cn(
          'relative flex flex-col h-full w-full overflow-y-scroll overflow-x-hidden pb-24',
          'scroll-visible'
        )}
      >
        {stack.map((r, i) => {
          return (
            <div
              key={i}
              className={cn('grid grid-cols-[30px_1fr] p-2 my-1 mx-1 rounded', {
                'bg-green-900': r.added,
                'bg-red-900': r.removed,
              })}
            >
              <div className="text-sm text-stone-300">{i}.</div>
              {r._ === 'int' && (
                <div className="min-w-0 overflow-hidden">
                  <div className="text-sm text-stone-300">Int</div>
                  <div>{r.value}</div>
                </div>
              )}

              {r._ === 'cell' && (
                <div className="min-w-0 overflow-hidden">
                  <div className="text-sm text-stone-300">Cell</div>
                  <div>{r.value}</div>

                  <div className="flex gap-2 items-baseline">
                    <div className="text-sm text-stone-300">Bits: </div>
                    <div>
                      {r.bits[0]} - {r.bits[1]}
                    </div>
                    <div className="text-sm text-stone-300">Refs:</div>
                    <div>
                      {r.refs[0]} - {r.refs[1]}
                    </div>
                  </div>
                </div>
              )}

              {r._ === 'slice' && (
                <div className="min-w-0 overflow-hidden">
                  <div className="text-sm text-stone-300">Slice</div>
                  <div>{r.value}</div>

                  <div className="flex gap-2 items-baseline">
                    <div className="text-sm text-stone-300">Bits: </div>
                    <div>
                      {r.bits[0]} - {r.bits[1]}
                    </div>
                    <div className="text-sm text-stone-300">Refs:</div>
                    <div>
                      {r.refs[0]} - {r.refs[1]}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
