import { useLiteclient } from '@/store/liteClient'
import { LiteClientBlockchainStorage } from '@/utils/liteClientBlockchainStorage'
import { ManagedSendMessageResult, ParsedTransaction } from '@/utils/ManagedBlockchain'
import { useState, useEffect } from 'react'
import { Address, beginCell, Cell, Dictionary, loadMessage } from '@ton/core'
import { LiteClient } from 'ton-lite-client'
import { parseInternal } from '@truecarry/tlb-abi'
import { Blockchain } from '@ton/sandbox'

const libs: Record<string, Buffer> = {}
let megaLibsCell = beginCell().endCell()

async function checkForLibraries(cell: Cell, liteClient: LiteClient) {
  const toCheck = [cell]
  let libFound = false
  while (toCheck.length > 0) {
    const current = toCheck.pop()
    if (current) {
      if (current.isExotic) {
        const libHash = current.beginParse(true).skip(8).loadBuffer(32)
        const libData = await liteClient.getLibraries([libHash])
        for (const lib of libData.result) {
          libs[lib.hash.toString('hex')] = lib.data
        }

        const libDict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())

        for (const [hash, lib] of Object.entries(libs)) {
          libDict.set(BigInt(`0x${hash}`), Cell.fromBoc(lib)[0])
        }

        megaLibsCell = beginCell().storeDictDirect(libDict).endCell()
        libFound = true
      }
      for (const ref of current.refs) {
        toCheck.push(ref)
      }
    }
  }

  return libFound
}

export function useEmulatedTxInfo(cell: Cell | undefined, ignoreChecksig: boolean = false) {
  const [response, setResponse] = useState<ManagedSendMessageResult | undefined>()
  const [progress, setProgress] = useState<{ total: number; done: number }>({ done: 0, total: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const liteClient = useLiteclient() as LiteClient

  useEffect(() => {
    if (!cell) {
      setResponse(undefined)
      return
    }

    let isStopped = false

    const stopEmulator = () => {
      isStopped = true
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
        let blockchain = await Blockchain.create({
          storage,
        })

        blockchain.verbosity = {
          blockchainLogs: true,
          vmLogs: 'vm_logs_full',
          debugLogs: true,
          print: false,
        }
        blockchain.libs = megaLibsCell
        const msg = loadMessage(cell.beginParse())

        let shouldRestart = false

        const runEmulator = async () => {
          const iter = await blockchain.sendMessageIter(msg, { ignoreChksig: ignoreChecksig })
          const transactions: ParsedTransaction[] = []
          for await (const tx of iter) {
            if (isStopped) {
              break
            }

            if (
              tx.description.type === 'generic' &&
              tx.description.computePhase.type === 'vm' &&
              tx.description.computePhase.exitCode === 9
            ) {
              if (tx.vmLogs.includes('failed to load library cell')) {
                // check lib in init
                if (tx.inMessage?.init) {
                  const code = tx.inMessage.init.code
                  if (code) {
                    const libFound = await checkForLibraries(code, liteClient)
                    if (libFound) {
                      console.log('lib found, restarting emulator')
                      shouldRestart = true
                      break
                    }
                  }
                }

                // check lib in destination
                const destination = tx.inMessage?.info.dest as Address
                if (destination) {
                  const lastBlock = await liteClient.getMasterchainInfo()
                  const destinationState = await liteClient.getAccountState(
                    destination,
                    lastBlock.last
                  )

                  if (destinationState?.state?.storage?.state?.type === 'active') {
                    const code = destinationState?.state?.storage?.state?.state?.code
                    if (code) {
                      const libFound = await checkForLibraries(code, liteClient)
                      if (libFound) {
                        console.log('lib found, restarting emulator')
                        shouldRestart = true
                        break
                      }
                    }
                  }
                }
              }
            }

            onAddMessage()
            onCompleteMessage()
            if (tx?.inMessage?.body) {
              const parsed = parseInternal(tx.inMessage.body.asSlice())
              if (parsed) {
                ;(tx as any).parsed = parsed
              }
            }

            transactions.push(tx as any)
            setResponse({
              transactions,
            })
            setIsLoading(false)
          }

          return transactions
        }

        do {
          shouldRestart = false
          const transactions = await runEmulator()

          if (!shouldRestart) {
            setResponse({ transactions })
            setIsLoading(false)
          } else {
            // Reset the blockchain instance with the updated library
            const storage = new LiteClientBlockchainStorage(liteClient)
            blockchain = await Blockchain.create({
              storage,
            })
            blockchain.verbosity = {
              blockchainLogs: true,
              vmLogs: 'vm_logs_full',
              debugLogs: true,
              print: false,
            }
            blockchain.libs = megaLibsCell
          }
          // eslint-disable-next-line no-unmodified-loop-condition
        } while (shouldRestart && !isStopped)

        // console.log('emulate res', transactions, Date.now() - start, isStopped)
        if (isStopped) {
          return
        }
        setIsLoading(false)
      } catch (err) {
        console.log('emulate err', err)
        setIsLoading(false)
      }
    }

    startEmulator().then()

    return () => {
      stopEmulator()
    }
  }, [cell, liteClient])

  return { response, progress, isLoading }
}
