import { faKeyboard, faCopy, faCheck } from '@fortawesome/free-solid-svg-icons'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { VmLogsInfo } from './VmLogsInfo'
import { useTransactionState } from '@/store/txInfo'
import { useState } from 'react'
import { StackInfo } from '@/hooks/useVmLogsNavigation'
import { VmStackInfo } from './VmStackInfo'
import { cn } from '@/utils/cn'

export function TxStackInfo({ filterText }: { filterText: string }) {
  const transactionState = useTransactionState()
  const [stack, setStack] = useState<StackInfo>({
    old: '',
    new: '',
    i: -1,
  })
  const [copied, setCopied] = useState(false)

  const copyExecutionLog = () => {
    const lines = transactionState.vmLogs.get().split('\n')
    const executeLines = lines.filter((line) => line.startsWith('execute'))
    const cleanLines = executeLines.map((line) => line.replace('execute ', ''))
    const executedCommands = cleanLines.join('\n')
    navigator.clipboard.writeText(executedCommands)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 1500)
  }

  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      {/* VM Logs Panel */}
      <div className="w-full md:w-[40%] md:max-w-[350px] flex flex-col h-full overflow-hidden border-r border-border">
        <div className="flex-none bg-secondary/30">
          <div className="p-3 border-b border-border flex justify-between">
            <h2 className="font-medium text-foreground">VM Execution Log</h2>
            <button
              className={cn(
                'cursor-pointer text-xs flex items-center gap-1 transition-colors duration-300 px-2 py-1 rounded'
              )}
              onClick={copyExecutionLog}
            >
              {copied ? (
                <>
                  <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCopy} className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>

          <div className="bg-secondary border-b border-border px-4 py-2">
            <div className="grid grid-cols-[60px_1fr_80px] text-sm font-medium text-muted-foreground">
              <div>Step</div>
              <div className="flex items-center">
                Command
                <div className="relative ml-2 group">
                  <FontAwesomeIcon
                    icon={faKeyboard}
                    size="sm"
                    className="text-muted-foreground/50 hover:text-muted-foreground cursor-help"
                  />
                  <div className="absolute left-0 top-6 z-50 hidden group-hover:block bg-popover border border-border rounded-md shadow-md p-2 text-xs text-foreground w-52">
                    <p className="font-semibold mb-1">Keyboard Navigation:</p>
                    <div className="grid grid-cols-[70px_1fr] gap-1">
                      <span className="font-mono bg-accent px-1 rounded">↑ / k</span>
                      <span>Previous instruction</span>
                      <span className="font-mono bg-accent px-1 rounded">↓ / j</span>
                      <span>Next instruction</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">Gas Used</div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <VmLogsInfo
            logs={transactionState.vmLogs.get()}
            setStack={setStack}
            filterText={filterText}
            selectedStack={stack.i}
          />
        </div>
      </div>

      {/* Stack Comparison Panel */}
      <div className="w-full md:w-full flex flex-col h-full overflow-hidden">
        <div className="grid grid-cols-2 flex-none">
          <div className="p-3 bg-secondary/30 border-r border-border">
            <h2 className="font-medium text-foreground">Stack Before</h2>
          </div>
          <div className="p-3 bg-secondary/30">
            <h2 className="font-medium text-foreground">Stack After</h2>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <VmStackInfo stack={stack} />
        </div>
      </div>
    </div>
  )
}
