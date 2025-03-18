import { setTransactionState, useTransactionState } from '@/store/txInfo'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useState } from 'react'
import { Cell, loadTransaction } from '@ton/core'
import { VmLogsInfo } from './VmLogsInfo'
import { VmStackInfo } from './VmStackInfo'

export type StackInfo = {
  old: string
  new: string
}

export function TxInfoPage() {
  const transactionState = useTransactionState()
  const [filterText, setFilterText] = useState('')

  useEffect(() => {
    listen(
      'txinfo',
      ({
        payload,
      }: {
        payload: {
          tx: string
          vmLogs: string
          debugLogs: string
          blockchainLogs: string
        }
      }) => {
        console.log('tx info listen', payload)

        setTransactionState({
          tx: loadTransaction(Cell.fromBase64(payload.tx).asSlice()),
          vmLogs: payload.vmLogs,
          debugLogs: payload.debugLogs,
          blockchainLogs: payload.blockchainLogs,
        })
      }
    )
  }, [])

  const [stack, setStack] = useState({
    old: '',
    new: '',
  })

  return (
    <div className="h-screen">
      <div className="sticky top-0 bg-background z-10 border-b">
        <div className="grid grid-cols-3 gap-2 md:grid-cols-[400px_1fr_1fr] h-full overflow-hidden relative">
          <div className="flex p-2">
            <input
              type="text"
              placeholder="Filter commands..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex p-2 border-l">
            <div className="self-center">Stack Before</div>
          </div>
          <div className="flex p-2 border-l">
            <div className="self-center">Stack After</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-[400px_1fr_1fr] h-full overflow-hidden relative">
        <VmLogsInfo
          logs={transactionState.vmLogs.get()}
          setStack={setStack}
          filterText={filterText}
        />
        <VmStackInfo stack={stack} />
      </div>
    </div>
  )
}
