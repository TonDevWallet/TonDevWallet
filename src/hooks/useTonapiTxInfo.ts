import { useLiteclient } from '@/store/liteClient'
import { formatGasInfo } from '@/utils/formatNumbers'
import { LiteClientBlockchainStorage } from '@/utils/liteClientBlockchainStorage'
import { ManagedSendMessageResult, ManagedBlockchain } from '@/utils/ManagedBlockchain'
import { useState, useEffect } from 'react'
import { Cell, loadMessage } from 'ton-core'
import { LiteClient } from 'ton-lite-client'

export function useTonapiTxInfo(cell: Cell | undefined) {
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
        const { result, emitter, gasMap } = await blockchain.sendMessageWithProgress(msg, {
          ignoreChksig: true,
        })

        let isStopped = false
        stopEmulator = () => {
          isStopped = true
          emitter.emit('stop')

          emitter.removeListener('add_message', onAddMessage)
          emitter.removeListener('complete_message', onCompleteMessage)
        }

        emitter.on('add_message', onAddMessage)
        emitter.on('complete_message', onCompleteMessage)
        const res = await result
        console.log('emulate res', res, Date.now() - start, isStopped, gasMap)
        formatGasInfo(gasMap)
        if (isStopped) {
          return
        }
        setResponse(res)
        setIsLoading(false)
      } catch (err) {
        console.log('emulate err', err)
        setIsLoading(false)
      }
    }

    startEmulator()

    return () => {
      console.log('unmount effect')
      stopEmulator()
    }
  }, [cell, liteClient])

  return { response, progress, isLoading }
}
