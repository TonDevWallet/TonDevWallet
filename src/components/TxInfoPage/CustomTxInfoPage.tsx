import { setTransactionState, useTransactionState } from '@/store/txInfo'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useState } from 'react'
import { Cell, loadTransaction } from 'ton-core'
import { VmLogsInfo } from './VmLogsInfo'
import { VmStackInfo } from './VmStackInfo'

export function CustomTxInfoPage() {
  const transactionState = useTransactionState()

  const [stack, setStack] = useState('')
  const [logs, setLogs] = useState('')

  const newLogs = (v: string) => {
    v = v.replaceAll('code cell hash', '\ncode cell hash')
    v = v.replaceAll('execute', '\nexecute')
    v = v.replaceAll('gas remaining', '\ngas remaining')
    v = v.replaceAll('code cell hash', '\ncode cell hash')
    console.log('replace', v)
    setLogs(v)
  }

  return (
    <div className="h-screen">
      <div>
        LogsInput
        <input type="text" value={logs} onChange={(e) => newLogs(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-[400px_1fr] h-[500px] overflow-hidden relative">
        <VmLogsInfo logs={logs} setStack={setStack} />
        <VmStackInfo stack={stack} />
      </div>
    </div>
  )
}
