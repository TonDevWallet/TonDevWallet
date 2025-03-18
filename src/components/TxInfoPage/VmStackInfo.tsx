import { useMemo } from 'react'
import { StackInfo } from './TxInfoPage'
import { diffLines } from 'diff'
import { StackItem } from '@/types/stack'
import { StackItemComponent } from './StackItem/StackItem'

function stackItemToText(item: StackItem) {
  if (item._ === 'tuple') {
    return item.items.map((i) => stackItemToText(i)).join(' ')
  }

  if (item._ === 'int') {
    return item.value
  }

  if (item._ === 'cont') {
    return 'Cont'
  }

  if (item._ === 'builder') {
    return item.value
  }

  return item.value + `[${item.bits[0]}..${item.bits[1]}]` + `[${item.refs[0]}..${item.refs[1]}]`
}

function findOpeningAndClosingBracket(stackData: string[]): [number, number] {
  let counter = 0
  let firstBracket = 9999
  let lastBracket = 0

  for (let i = 0; i < stackData.length; i++) {
    const char = stackData[i]
    if (char === '[') {
      counter++
      if (i < firstBracket) {
        firstBracket = i
      }
    }
    if (char === ']') {
      counter--
      if (i > lastBracket) {
        lastBracket = i
      }
    }
    if (counter === 0) {
      console.log('firstBracket', firstBracket, 'lastBracket', lastBracket, stackData)
      return [firstBracket, lastBracket]
    }
  }

  return [0, 0]
}

function getStackInfo(stackData: string) {
  const trimmedData = stackData.trim()

  // Replace brackets with spaces around them, then split by spaces and filter out empty strings
  // This creates an array where brackets are separate elements
  const oldLines = trimmedData
    .replace(/\[/g, ' [ ')
    .replace(/\]/g, ' ] ')
    .split(' ')
    .filter((item) => item.trim() !== '')

  // oldLines can be used for further processing if needed

  // const openingBracket = trimmedData.indexOf('[')
  // const closingBracket = trimmedData.lastIndexOf(']')

  const [firstBracket, lastBracket] = findOpeningAndClosingBracket(oldLines)

  const lines = oldLines.slice(firstBracket + 1, lastBracket)
  console.log('stackData', stackData)
  console.log('lines', lines)

  // const lines = dataToParse.split(' ')
  const res: StackItem[] = []

  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    if (l.startsWith('[')) {
      const [firstBracket, lastBracket] = findOpeningAndClosingBracket(lines.slice(i))
      const tupleToParse = lines.slice(i + firstBracket, i + lastBracket + 1).join(' ')

      // Process nested arrays
      console.log('parsing tuple stack')
      const tupleStack = getStackInfo(tupleToParse)

      console.log('Got tuple stack', tupleStack)

      res.push({
        _: 'tuple',
        items: tupleStack,
      })
      i += lastBracket + 1 - firstBracket

      continue
    }

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
    } else if (l.startsWith('CS{Cell{')) {
      const bits = lines[i + 2].replace(';', '').split('..')
      const refs = lines[i + 4].replace('}', '').split('..')
      res.push({
        _: 'cell',
        value: l.slice(0, -1),
        bits: [parseInt(bits[0]), parseInt(bits[1])],
        refs: [parseInt(refs[0]), parseInt(refs[1])],
      })
      i += 7
    } else if (l === 'Cont{vmc_std}') {
      res.push({
        _: 'cont',
      })
      i++
    } else if (l.startsWith('BC{') && l.endsWith('}')) {
      res.push({
        _: 'builder',
        value: l.slice(3, -1),
      })
      i++
    } else {
      if (l.indexOf('{') !== -1 || l.indexOf('[') !== -1) {
        console.log('Unknown stack item:', l, lines)
        i++
        continue
      }
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
      .reverse()
      .map((s, i) => ({ ...s, index: i }))
  }, [stack.old])
  const newStackInfo = useMemo(() => {
    return getStackInfo(stack.new)
      .reverse()
      .map((s, i) => ({ ...s, index: i }))
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

  return (
    <div className="grid grid-cols-2 h-full divide-x divide-border">
      <StackList stack={stackDiff.oldStackWithDiff} />
      <StackList stack={stackDiff.newStackWithDiff} />
    </div>
  )
}

function StackList({ stack }: { stack: StackItem[] }) {
  return (
    <div className="h-full overflow-auto">
      {stack.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <span>No stack data available</span>
        </div>
      ) : (
        <div className="p-4">
          {stack.map((item) => (
            <StackItemComponent key={item.index} item={item} index={item.index || 0} />
          ))}
        </div>
      )}
    </div>
  )
}
