import { setTransactionState, useTransactionState } from '@/store/txInfo'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useState } from 'react'
import { Cell, loadTransaction } from '@ton/core'
import { VmLogsInfo } from './VmLogsInfo'
import { VmStackInfo } from './VmStackInfo'

export function TxInfoPage() {
  const transactionState = useTransactionState()

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

  const [stack, setStack] = useState('')

  return (
    <div className="h-screen">
      <div className="grid grid-cols-2 md:grid-cols-[400px_1fr] h-full overflow-hidden relative">
        <VmLogsInfo logs={transactionState.vmLogs.get()} setStack={setStack} />
        <VmStackInfo stack={stack} />
      </div>
    </div>
  )
}
