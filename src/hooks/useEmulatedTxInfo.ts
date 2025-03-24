import { useLiteclient } from '@/store/liteClient'
import { LiteClientBlockchainStorage } from '@/utils/liteClientBlockchainStorage'
import { ManagedSendMessageResult, ParsedTransaction } from '@/utils/ManagedBlockchain'
import { useState, useEffect, useRef } from 'react'
import { Address, beginCell, Cell, Dictionary, loadMessage } from '@ton/core'
import { LiteClient } from 'ton-lite-client'
import { parseWithPayloads } from '@truecarry/tlb-abi'
import { Blockchain, BlockchainSnapshot, BlockchainStorage } from '@ton/sandbox'
import { bigIntToBuffer } from '@/utils/ton'
import { AllShardsResponse } from 'ton-lite-client/dist/types'
import { getShardBitMask, isSameShard } from '@/utils/shards'

const libs: Record<string, Buffer> = {}
export let megaLibsCell = beginCell().endCell()

export async function checkForLibraries(cells: Cell[], liteClient: LiteClient) {
  const toCheck = [...cells]
  let libFound = false
  while (toCheck.length > 0) {
    const current = toCheck.pop()
    if (current) {
      for (const ref of current.refs) {
        toCheck.push(ref)
      }
      if (current.isExotic) {
        const libSlice = current.beginParse(true)
        const type = libSlice.loadUint(8)
        if (type !== 0x02) {
          continue
        }
        const libHash = current.beginParse(true).skip(8).loadBuffer(32)

        if (libs[libHash.toString('hex')]) {
          continue
        }

        const libData = await liteClient.getLibraries([libHash])
        if (libData.result.length === 0) {
          continue
        }

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
    }
  }

  return libFound
}

async function checkAndLoadLibraries(
  genericTx: ParsedTransaction,
  blockchain: Blockchain,
  storage: BlockchainStorage,
  liteClient: LiteClient
) {
  if (
    genericTx.description.type === 'generic' &&
    genericTx.description.computePhase.type === 'vm' &&
    genericTx.description.computePhase.exitCode === 9 &&
    genericTx.vmLogs.includes('failed to load library cell')
  ) {
    const messageCells: Cell[] = []
    try {
      const blockchainCopy = await blockchain.snapshot()
      const { blockchain: verboseBlockchain } = await initializeBlockchain(liteClient)
      await verboseBlockchain.loadFrom(blockchainCopy)

      setBlockchainVerbosityVerbose(verboseBlockchain)

      if (!genericTx.inMessage) {
        return // making ts happy
      }
      const verboseEmulatedTxResult = await verboseBlockchain.sendMessage(genericTx.inMessage, {
        ignoreChksig: true,
      })
      const verboseEmulatedTx = verboseEmulatedTxResult.transactions[0]

      const cellRegex = /C{([A-Fb0-9]+)}/g
      const cellMatch = verboseEmulatedTx.vmLogs.matchAll(cellRegex)
      const hexes: Record<string, number> = {}

      for (const match of cellMatch) {
        hexes[match[1]] = 1
      }

      if (Object.keys(hexes).length > 0) {
        for (const hex of Object.keys(hexes)) {
          try {
            const cell = Cell.fromBoc(Buffer.from(hex, 'hex'))[0]
            messageCells.push(cell)
          } catch (err) {
            console.log('error loading cell', hex)
          }
        }
      }
    } catch (err) {
      console.log('error in checkAndLoadLibraries', err)
    }
    if (genericTx.inMessage?.body) {
      messageCells.push(genericTx.inMessage.body)
    }
    if (genericTx.inMessage?.init?.code) {
      messageCells.push(genericTx.inMessage.init.code)
    }
    const contracts = await storage.knownContracts()
    const currentContractHash = bigIntToBuffer(genericTx.address) as any
    for (const contract of contracts) {
      if (contract.address.hash.equals(currentContractHash)) {
        if (contract.accountState?.type === 'active') {
          if (contract.accountState.state.code) {
            messageCells.push(contract.accountState.state.code)
          }
          // if (contract.accountState.state.data) {
          //   messageCells.push(contract.accountState.state.data)
          // }
          // console.log('Contract', contract.address.toString())
        }
      }
    }

    const libFound = await checkForLibraries(messageCells, liteClient)
    if (libFound) {
      return true
    }
  }
  return false
}

const initializeBlockchain = async (liteClient: LiteClient) => {
  const storage = new LiteClientBlockchainStorage(liteClient)
  const blockchain = await Blockchain.create({ storage })
  setBlockchainVerbosityFull(blockchain)
  blockchain.libs = megaLibsCell
  return { storage, blockchain }
}

function setBlockchainVerbosityFull(blockchain: Blockchain) {
  blockchain.verbosity = {
    blockchainLogs: true,
    vmLogs: 'vm_logs_full',
    debugLogs: true,
    print: false,
  }
}
function setBlockchainVerbosityVerbose(blockchain: Blockchain) {
  blockchain.verbosity = {
    blockchainLogs: true,
    vmLogs: 'vm_logs_verbose',
    debugLogs: true,
    print: false,
  }
}

export function useEmulatedTxInfo(cell: Cell | undefined, ignoreChecksig: boolean = false) {
  const [response, setResponse] = useState<ManagedSendMessageResult | undefined>()
  const [progress, setProgress] = useState<{ total: number; done: number }>({ done: 0, total: 0 })
  const [snapshot, setSnapshot] = useState<BlockchainSnapshot | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const liteClient = useLiteclient() as LiteClient
  const txesRef = useRef<ParsedTransaction[]>([])

  const updateProgress = () => {
    setProgress((p) => ({ total: p.total + 1, done: p.done + 1 }))
  }

  useEffect(() => {
    if (!cell) {
      setResponse(undefined)
      return
    }

    let isStopped = false

    const runEmulator = async (blockchain: Blockchain, storage: BlockchainStorage, msg: any) => {
      const iter = await blockchain.sendMessageIter(msg, { ignoreChksig: ignoreChecksig })
      const transactions: ParsedTransaction[] = [...(txesRef?.current || [])]

      let shards: AllShardsResponse | undefined
      const getShards = async () => {
        try {
          const masterchainInfo = await liteClient.getMasterchainInfo()
          shards = await liteClient.getAllShardsInfo(masterchainInfo.last)
        } catch (err) {
          console.log('error getting shards', err)
        }
      }
      await getShards()

      let i = 0
      for await (const tx of iter) {
        if (isStopped) break

        const shouldRestart = await checkAndLoadLibraries(
          tx as ParsedTransaction,
          blockchain,
          storage,
          liteClient
        )
        if (shouldRestart) {
          txesRef.current = transactions
          return { transactions, shouldRestart }
        }
        ;(tx as ParsedTransaction).shards = shards

        const txAddress = new Address(0, bigIntToBuffer(tx.address))
        const shard = Object.keys(shards?.shards[0] || {}).find((shard) =>
          isSameShard(txAddress, BigInt.asUintN(64, BigInt(shard)))
        )
        ;(tx as ParsedTransaction).shard = getShardBitMask(
          BigInt.asUintN(64, BigInt(shard || '0'))
        ).toString()

        // const avgDelay = 1 // 7 seconds
        const isTxSameShard =
          (tx as ParsedTransaction)?.shard === (tx as ParsedTransaction)?.parent?.shard

        const delay = !(tx as ParsedTransaction)?.parent?.shard ? 0 : isTxSameShard ? 0 : 1
        ;(tx as ParsedTransaction).delay = delay
        ;(tx as ParsedTransaction).totalDelay =
          delay + ((tx as ParsedTransaction)?.parent?.totalDelay || 0)

        updateProgress()

        if (tx?.inMessage?.body) {
          const parsed = parseWithPayloads(tx.inMessage.body.asSlice())
          if (parsed) {
            ;(tx as any).parsed = parsed
          }
          if (
            parsed?.internal === 'jetton_burn' ||
            parsed?.internal === 'jetton_mint' ||
            parsed?.internal === 'jetton_transfer' ||
            parsed?.internal === 'jetton_internal_transfer'
          ) {
            try {
              const jettonInfo = await blockchain.runGetMethod(
                new Address(0, bigIntToBuffer(tx.address)),
                'get_wallet_data'
              )
              const balance = jettonInfo.stackReader.readBigNumber()
              const owner = jettonInfo.stackReader.readAddressOpt()
              const jettonAddress = jettonInfo.stackReader.readAddressOpt()
              const jettonData = {
                balance,
                owner,
                jettonAddress,
              }
              ;(tx as any).jettonData = jettonData
            } catch (err) {
              console.log('error getting jetton info', err)
            }
          }
        }

        transactions[i] = tx as any
        i++
        setResponse({ transactions })
        setIsLoading(false)
        setSnapshot(blockchain.snapshot())
      }

      txesRef.current = transactions
      return { transactions, snapshot, shouldRestart: false }
    }

    const emulateTransaction = async () => {
      try {
        const msg = loadMessage(cell.beginParse())

        let restart = true
        // eslint-disable-next-line no-unmodified-loop-condition
        while (restart && !isStopped) {
          const { blockchain, storage } = await initializeBlockchain(liteClient)
          const { transactions, shouldRestart } = await runEmulator(blockchain, storage, msg)
          restart = shouldRestart

          if (!restart) {
            console.log('emulation finished', transactions)
            setResponse({ transactions })
            setIsLoading(false)
          }
        }

        if (isStopped) return
        setIsLoading(false)
      } catch (err) {
        console.log('emulate err', err)
        setIsLoading(false)
      }
    }

    emulateTransaction()

    return () => {
      isStopped = true
    }
  }, [cell, liteClient, ignoreChecksig])

  return { response, progress, isLoading, snapshot }
}
