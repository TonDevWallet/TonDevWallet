import { useMemo } from 'react'
import { StackInfo } from './TxInfoPage'

type LogRowData = {
  stack: string
  codeHash: string
  cmd: string
  gas: string
  exception: string
  exceptionHandler: string
  i: number
  raw: string
}

export function VmLogsInfo({
  logs,
  setStack,
  filterText,
}: {
  logs: string
  setStack: (stack: StackInfo) => void
  filterText: string
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

  return (
    <div className="relative h-full overflow-hidden">
      <div className="relative flex flex-col w-full h-full overflow-y-scroll overflow-x-hidden px-8 pt-2">
        <div className="grid grid-cols-[60px_1fr_60px] h-6">
          <div>#</div>
          <div>CMD</div>
          <div className="text-right">Gas</div>
        </div>

        {filteredLogs.map((command) => {
          return (
            <LogsRow
              command={command}
              logsData={logsData}
              i={command.i}
              setStack={setStack}
              key={command.i}
            />
          )
        })}
      </div>
    </div>
  )
}

function LogsRow({
  command,
  logsData,
  i,
  setStack,
}: {
  command: LogRowData
  logsData: LogRowData[]
  i: number
  setStack: (stack: StackInfo) => void
}) {
  const prevCommand = logsData[i - 1]
  const nextCommand = logsData[i + 1]
  const gas = parseInt(prevCommand?.gas || '1000000') - parseInt(command.gas)
  return (
    <div className="grid grid-cols-[60px_1fr_60px] h-6" key={i}>
      <div>{i}.</div>
      <div
        className="min-w-0 overflow-hidden break-all cursor-pointer hover:bg-gray-500 rounded transition-all duration-200 px-1"
        onClick={() => {
          setStack({
            old: command?.stack || '',
            new: nextCommand?.stack || '',
          })
        }}
      >
        {command.cmd}
      </div>
      <div className="text-right">{gas || ''}</div>
      {(command.exception || command.exceptionHandler) && (
        <div className="col-span-3">
          <div>exception: {command.exception}</div>
          <div>exceptionHandler: {command.exceptionHandler}</div>
        </div>
      )}
    </div>
  )
}
