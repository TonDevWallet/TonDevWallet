import { useMemo } from 'react'

interface StackInt {
  _: 'int'
  value: string
}

interface StackCell {
  _: 'cell'
  value: string
}

interface StackSlice {
  _: 'slice'
  value: string
  bits: [number, number]
  refs: [number, number]
}

type StackItem = StackInt | StackCell | StackSlice

export function VmStackInfo({ stack }: { stack: string }) {
  const stackInfo = useMemo(() => {
    const lines = stack.split(' ')
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
        })
        i++
      } else {
        res.push({
          _: 'int',
          value: l,
        })
        i++
      }
    }

    return res
  }, [stack])
  return (
    <div className="relative h-full overflow-hidden">
      <div className="relative flex flex-col gap-2 h-full w-full overflow-y-scroll overflow-x-hidden px-8">
        {stackInfo.map((r, i) => {
          return (
            <div key={i} className="grid grid-cols-[30px_1fr]">
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
