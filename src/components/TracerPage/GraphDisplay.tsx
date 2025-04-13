import { cn } from '@/utils/cn'
import { Block } from '@/components/ui/Block'
import { MessageFlow } from '../IndexPage/MessageFlow'
import { ParsedTransaction } from '@/utils/ManagedBlockchain'
import { useActiveRemoteTraceData } from '@/store/tracerState'
import { Progress } from '@/components/ui/progress'

interface GraphDisplayProps {
  transactions: ParsedTransaction[] | undefined
}

export function GraphDisplay({ transactions }: GraphDisplayProps) {
  const remoteTraceData = useActiveRemoteTraceData()
  const isRemoteTrace = !!remoteTraceData

  // Calculate progress percentage
  const progressPercentage =
    isRemoteTrace && remoteTraceData.progress.total.get() > 0
      ? (remoteTraceData.progress.loaded.get() / remoteTraceData.progress.total.get()) * 100
      : 0

  return (
    <div className="flex flex-col gap-4 flex-1 overflow-hidden">
      <Block className={cn('flex-1 min-h-0', 'p-0')}>
        <MessageFlow transactions={transactions} />
      </Block>

      {isRemoteTrace && remoteTraceData?.loading?.get() && (
        <div className="mt-2">
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span>Emulation progress</span>
            <span>
              {remoteTraceData.progress.loaded.get()} of {remoteTraceData.progress.total.get()}{' '}
              transactions
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          {remoteTraceData?.error?.get() && (
            <div className="text-destructive text-sm mt-1">{remoteTraceData.error.get()}</div>
          )}
        </div>
      )}
    </div>
  )
}
