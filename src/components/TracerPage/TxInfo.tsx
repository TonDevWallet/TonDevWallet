import { useState } from 'react'
import { Block } from '@/components/ui/Block'
import { VmLogsInfo } from '../TxInfoPage/VmLogsInfo'
import { VmStackInfo } from '../TxInfoPage/VmStackInfo'
import { Separator } from '@/components/ui/separator'
import { StackInfo } from '../TxInfoPage/TxInfoPage'

interface TxInfoProps {
  tx: any
}

export function TxInfo({ tx }: TxInfoProps) {
  const [stack, setStack] = useState<StackInfo>({
    old: '',
    new: '',
    i: -1,
  })

  if (!tx) return null

  return (
    <div className="flex flex-col gap-4">
      <Separator className="my-4" />
      <h2 className="text-xl font-semibold">Transaction Details</h2>
      <div className="grid grid-cols-2 gap-4 relative">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-medium">VM Logs</h3>
          <Block>
            <VmLogsInfo
              logs={tx.vmLogs || ''}
              setStack={setStack}
              filterText={''}
              selectedStack={stack.i}
            />
          </Block>
        </div>
        <div className="h-full">
          <div className="flex flex-col gap-2 sticky top-4">
            <h3 className="text-lg font-medium">Stack Info</h3>
            <Block className="h-[600px] overflow-auto">
              <VmStackInfo stack={stack} />
            </Block>
          </div>
        </div>
      </div>
    </div>
  )
}
