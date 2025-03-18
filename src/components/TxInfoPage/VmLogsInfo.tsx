import { useMemo } from 'react'
import { cn } from '@/utils/cn'
import { LogRowData, StackInfo, useVmLogsNavigation } from '@/hooks/useVmLogsNavigation'

export function VmLogsInfo({
  logs,
  setStack,
  filterText,
  selectedStack,
}: {
  logs: string
  setStack: (stack: StackInfo) => void
  filterText: string
  selectedStack: number
}) {
  const logsData: LogRowData[] = useMemo(() => {
    const instructions = logs.split('stack: ').slice(1)
    const commands = instructions.map((instruction, i) => {
      const lines = instruction.split('\n').filter((l) => l)

      const stack = lines[0]

      let cmd = ''
      let gas = ''
      let exception = ''
      let exceptionHandler = ''
      let codeHash = ''

      for (const line of lines.slice(1)) {
        if (line.startsWith('gas remaining: ')) {
          gas = line.split('gas remaining: ')[1]
        } else if (line.startsWith('execute ')) {
          cmd = line.split('execute ')[1]
        } else if (line.startsWith('code cell hash: ')) {
          codeHash = line.split('code cell hash: ')[1]
        } else if (line.startsWith('default exception handler, ')) {
          exceptionHandler = line.split('default exception handler, ')[1]
        } else if (line.startsWith('handling exception code ')) {
          exception = line.split('handling exception code ')[1]
        } else {
          console.log('unknown line', line, instruction)
        }
      }

      return {
        stack,
        codeHash,
        cmd,
        gas,
        exception,
        exceptionHandler,
        raw: instruction,
        i,
      }
    })

    return commands
  }, [logs])

  const filteredLogs = useMemo(() => {
    if (!filterText) return logsData
    return logsData.filter(
      (command) =>
        command.cmd.toLowerCase().includes(filterText.toLowerCase()) ||
        command.exception.toLowerCase().includes(filterText.toLowerCase()) ||
        command.exceptionHandler.toLowerCase().includes(filterText.toLowerCase())
    )
  }, [logsData, filterText])

  // Use the updated hook with parent component's state
  const { selectRow } = useVmLogsNavigation(logsData, selectedStack, setStack)

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 bg-secondary border-b border-border px-4 py-2">
        <div className="grid grid-cols-[60px_1fr_80px] text-sm font-medium text-muted-foreground">
          <div>Step</div>
          <div>Command</div>
          <div className="text-right">Gas Used</div>
        </div>
      </div>

      <div className="pb-6">
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No commands match the filter</div>
        ) : (
          filteredLogs.map((command) => (
            <LogsRow
              command={command}
              logsData={logsData}
              i={command.i}
              setStack={selectRow}
              selectedStack={selectedStack}
              key={command.i}
            />
          ))
        )}
      </div>
    </div>
  )
}

function LogsRow({
  command,
  logsData,
  i,
  setStack,
  selectedStack,
}: {
  command: LogRowData
  logsData: LogRowData[]
  i: number
  setStack: (index: number) => void
  selectedStack: number
}) {
  const prevCommand = logsData[i - 1]
  const gas = parseInt(prevCommand?.gas || '1000000') - parseInt(command.gas)

  const hasException = command.exception || command.exceptionHandler

  return (
    <div
      id={`vm-log-row-${i}`}
      className={cn(
        'py-1.5 px-4 border-b border-border/50 group cursor-pointer',
        hasException ? 'bg-destructive/10 border-destructive/30' : '',
        i === selectedStack ? 'bg-primary/10 border-primary/30' : ''
      )}
      onClick={() => setStack(i)}
    >
      <div className="grid grid-cols-[60px_1fr_80px]">
        <div className="text-muted-foreground">{i}.</div>
        <div
          className={cn(
            'min-w-0 overflow-hidden text-ellipsis cursor-pointer rounded transition-all duration-200 px-1.5 py-0.5',
            'text-foreground',
            'group-hover:bg-accent/50'
          )}
          title={command.cmd}
        >
          {command.cmd || '(Empty Command)'}
        </div>
        <div className="text-right text-foreground">{gas || '-'}</div>
      </div>

      {hasException && (
        <div className="mt-1 pl-[60px] text-sm text-destructive">
          {command.exception && <div className="mb-1">Exception: {command.exception}</div>}
          {command.exceptionHandler && <div>Handler: {command.exceptionHandler}</div>}
        </div>
      )}
    </div>
  )
}
