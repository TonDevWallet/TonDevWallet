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
        const msg = loadMessage(cell.beginParse())
        const start = Date.now()
        const { result, emitter, gasMap } = blockchain.sendMessageWithProgress(msg)

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
        console.log('gasmap', gasMap)
        console.log('emulate res', res)
        formatGasInfo(gasMap)

        console.log('b res', res.events.length, Date.now() - start, isStopped)

        if (isStopped) {
          return
        }
        setResponse(res)
        setIsLoading(false)
      } catch (err) {
        console.log('b err', err)
        setIsLoading(false)
      }
    }

    startEmulator()

    return () => {
      console.log('unmount effect')
      stopEmulator()
    }
  }, [cell])

  return { response, progress, isLoading }
}
