import { useKeyboardNavigation } from './useKeyboardNavigation'

export type StackInfo = {
  old: string
  new: string
  i: number
}

export type LogRowData = {
  stack: string
  codeHash: string
  cmd: string
  gas: string
  exception: string
  exceptionHandler: string
  i: number
  raw: string
}

export function useVmLogsNavigation(
  logsData: LogRowData[],
  selectedStackIndex: number,
  setStackCallback: (stack: StackInfo) => void
) {
  const handleStackSelection = (index: number) => {
    const currentCommand = logsData[index]
    const nextCommand = logsData[index + 1]

    if (currentCommand) {
      // Update parent state
      setStackCallback({
        old: currentCommand?.stack || '',
        new: nextCommand?.stack || '',
        i: index,
      })

      // Scroll the selected item into view
      scrollIntoView(`vm-log-row-${index}`)
    }
  }

  const { scrollIntoView } = useKeyboardNavigation({
    selectedIndex: selectedStackIndex,
    itemsCount: logsData.length,
    onSelect: handleStackSelection,
    keys: {
      up: ['ArrowUp', 'k'],
      down: ['ArrowDown', 'j'],
    },
  })

  return {
    scrollIntoView,
    selectRow: handleStackSelection,
  }
}
