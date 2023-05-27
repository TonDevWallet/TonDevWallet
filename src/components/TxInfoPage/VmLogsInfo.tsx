import { useMemo } from 'react'

export function VmLogsInfo({ logs, setStack }: { logs: string; setStack: (string) => void }) {
  const logsData = useMemo(() => {
    const instructions = logs.split('stack: ').slice(1)
    const commands = instructions.map((instruction) => {
      const lines = instruction.split('\n')

      const stack = lines[0]
      const codeHash = lines[1]
      const cmd = lines[2].split('execute ')[1]
      let gas = ''
      let exception = ''
      let exceptionHandler = ''

      if (lines.length === 5) {
        gas = lines[3].split('gas remaining: ')[1]
      } else {
        exception = lines[3]
        exceptionHandler = lines[4]
      }
      return {
        stack,
        codeHash,
        cmd,
        gas,
        exception,
        exceptionHandler,
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
          console.log(command, Number(prevCommand?.gas || 10000000), 'a', parseInt(command.gas))
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
              {command.exception && (
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
