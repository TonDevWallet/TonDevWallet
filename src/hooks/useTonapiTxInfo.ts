import { useLiteclient } from '@/store/liteClient'
// import { formatGasInfo } from '@/utils/formatNumbers'
import { LiteClientBlockchainStorage } from '@/utils/liteClientBlockchainStorage'
import { ManagedBlockchain, ManagedSendMessageResult } from '@/utils/ManagedBlockchain'
import { useState, useEffect } from 'react'
import { Cell, loadMessage } from '@ton/core'
import { LiteClient } from 'ton-lite-client'
import { BlockchainTransaction } from '@ton/sandbox'

export function useTonapiTxInfo(cell: Cell | undefined, ignoreChecksig: boolean = false) {
  const [response, setResponse] = useState<ManagedSendMessageResult | undefined>()
  const [progress, setProgress] = useState<{ total: number; done: number }>({ done: 0, total: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const liteClient = useLiteclient() as LiteClient

  useEffect(() => {
    if (!cell) {
      setResponse(undefined)
      return
    }

    let stopEmulator = () => {
      // do nothing
    }
    const startEmulator = async () => {
      try {
        setResponse(undefined)
        setProgress({ done: 0, total: 0 })
        setIsLoading(true)

        const onAddMessage = () => {
          setProgress((p) => ({ ...p, total: p.total + 1 }))
        }
        const onCompleteMessage = () => {
          setProgress((p) => ({ ...p, done: p.done + 1 }))
        }
        const storage = new LiteClientBlockchainStorage(liteClient)
        const blockchain = await ManagedBlockchain.create({
          storage,
        })
        // blockchain.verbosity = 'vm_logs_full'
        blockchain.verbosity = {
          blockchainLogs: true,
          vmLogs: 'vm_logs_full',
          debugLogs: true,
          print: false,
        }
        const msg = loadMessage(cell.beginParse())
        const start = Date.now()

        let isStopped = false

        const iter = await blockchain.sendMessageIter(msg, { ignoreChksig: ignoreChecksig })
        const transactions: BlockchainTransaction[] = []
        for await (const tx of iter) {
          if (isStopped) {
            break
          }

          onAddMessage()
          onCompleteMessage()
          transactions.push(tx as any)
          setResponse({
            transactions,
          })
          setIsLoading(false)
        }

        stopEmulator = () => {
          isStopped = true
        }

        console.log('emulate res', transactions, Date.now() - start, isStopped)
        // formatGasInfo(gasMap)
        if (isStopped) {
          return
        }
        setIsLoading(false)
      } catch (err) {
        console.log('emulate err', err)
        setIsLoading(false)
      }
    }

    startEmulator()

    return () => {
      stopEmulator()
    }
  }, [cell, liteClient])

  return { response, progress, isLoading }
}
