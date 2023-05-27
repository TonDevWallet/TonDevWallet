import { useMemo } from 'react'

export function VmLogsInfo({ logs, setStack }: { logs: string; setStack: (string) => void }) {
  const logsData = useMemo(() => {
    const instructions = logs.split('stack: ').slice(1)
    const commands = instructions.map((instruction) => {
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
      }
    })

    return commands
  }, [logs])

  return (
    <div className="relative h-full overflow-hidden">
      <div className="relative grid w-full h-full overflow-y-scroll overflow-x-hidden px-8">
        <div className="grid grid-cols-[60px_1fr_60px]">
          <div>#</div>
          <div>CMD</div>
          <div className="text-right">Gas</div>
        </div>

        {logsData.map((command, i) => {
          const prevCommand = logsData[i - 1]
          const gas = parseInt(prevCommand?.gas || '1000000') - parseInt(command.gas)
          return (
            <div className="grid grid-cols-[60px_1fr_60px] h-6" key={i}>
              <div>{i}.</div>
              <div
                className="min-w-0 overflow-hidden break-all cursor-pointer hover:bg-gray-500 rounded transition-all duration-200 px-1"
                onClick={() => {
                  setStack(command.stack)
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
        })}
      </div>
    </div>
  )
}
