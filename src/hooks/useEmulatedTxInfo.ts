import { useLiteclient } from '@/store/liteClient'
import type { ApiClient, LibraryClient } from '@/store/primaryChainClient'
import { ManagedSendMessageResult, ParsedTransaction } from '@/utils/ManagedBlockchain'
import { useState, useEffect, useRef } from 'react'
import { Address, beginCell, Cell, Dictionary, loadMessage } from '@ton/core'
import { parseWithPayloads } from '@truecarry/tlb-abi'
import { Blockchain, BlockchainSnapshot, BlockchainStorage } from '@ton/sandbox'
import { createAppExecutor } from '@/utils/appExecutor'
import { bigIntToBuffer } from '@/utils/ton'
import { AllShardsResponse } from 'ton-lite-client/dist/types'
import { getShardBitMask, isSameShard } from '@/utils/shards'
import { RecursivelyParseCellWithBlock } from '@/utils/tlb/cellParser'

const libs: Record<string, Buffer> = {}
export let megaLibsCell = beginCell().endCell()

function detectMissingLibrary(vmLogs: string | undefined, exitCode: number | undefined) {
  const logs = vmLogs ?? ''
  const lower = logs.toLowerCase()
  const missingHashes = [
    ...logs.matchAll(
      /(?:libraries do not contain code with hash|failed to load library cell:.*?hash)\s+([a-fA-F0-9]{64})/gi
    ),
  ].map((m) => m[1].toLowerCase())
  return {
    isMissingLibrary:
      exitCode === 9 ||
      lower.includes('failed to load library cell') ||
      lower.includes('libraries do not contain code with hash'),
    missingHashes: [...new Set(missingHashes)],
  }
}

function rebuildMegaLibsCell() {
  const libDict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
  for (const [hash, lib] of Object.entries(libs)) {
    libDict.set(BigInt(`0x${hash}`), Cell.fromBoc(lib)[0])
  }
  megaLibsCell = beginCell().storeDictDirect(libDict).endCell()
}

function rememberFetchedLibrary(hash: Buffer, data: Buffer) {
  const expectedHex = hash.toString('hex')
  const cell = Cell.fromBoc(data)[0]
  const actualHex = cell.hash().toString('hex')
  if (actualHex !== expectedHex) {
    return false
  }
  libs[expectedHex] = data
  return true
}

async function fetchLibrariesByHashes(hashes: string[], client: LibraryClient) {
  const toFetch = hashes.filter((hash) => !libs[hash])
  if (toFetch.length === 0) return false
  const libData = await client.getLibraries(toFetch.map((hash) => Buffer.from(hash, 'hex')))
  let added = 0
  for (const lib of libData.result) {
    if (rememberFetchedLibrary(lib.hash, lib.data)) added++
  }
  if (added > 0) {
    rebuildMegaLibsCell()
    return true
  }
  return false
}

export async function checkForLibraries(cells: Cell[], client: LibraryClient) {
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

        const directLibFound = await fetchLibrariesByHashes([libHash.toString('hex')], client)
        if (directLibFound) {
          libFound = true
          continue
        }
      }
    }
  }
  return libFound
}

async function checkAndLoadLibraries(
  genericTx: ParsedTransaction,
  blockchain: Blockchain,
  storage: BlockchainStorage,
  blockchainClient: ApiClient
) {
  const exitCode =
    genericTx.description.type === 'generic' && genericTx.description.computePhase.type === 'vm'
      ? genericTx.description.computePhase.exitCode
      : undefined
  const detection = detectMissingLibrary(genericTx.vmLogs, exitCode)
  if (
    genericTx.description.type === 'generic' &&
    genericTx.description.computePhase.type === 'vm' &&
    detection.isMissingLibrary
  ) {
    const directLibFound = await fetchLibrariesByHashes(detection.missingHashes, blockchainClient)
    if (directLibFound) {
      return true
    }

    const messageCells: Cell[] = []
    try {
      const blockchainCopy = await blockchain.snapshot()
      const { blockchain: verboseBlockchain } = await initializeBlockchain(blockchainClient)
      await verboseBlockchain.loadFrom(blockchainCopy)

      setBlockchainVerbosityVerbose(verboseBlockchain)

      if (!genericTx.inMessage) {
        return // making ts happy
      }
      const verboseEmulatedTxResult = await verboseBlockchain.sendMessage(genericTx.inMessage, {
        ignoreChksig: true,
      })
      const verboseEmulatedTx = verboseEmulatedTxResult.transactions[0]

      const cellRegex = /[cC]\{([A-Fa-f0-9]+)\}/g
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

    const libFound = await checkForLibraries(messageCells, blockchainClient)
    if (libFound) {
      return true
    }
  }
  return false
}

const initializeBlockchain = async (client: ApiClient) => {
  const storage = client.createStorageAdapter()
  const blockchain = await Blockchain.create({ storage, executor: await createAppExecutor() })
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
  const liteClient = useLiteclient()
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
    const blockchainClient = liteClient

    const runEmulator = async (blockchain: Blockchain, storage: BlockchainStorage, msg: any) => {
      const iter = await blockchain.sendMessageIter(msg, { ignoreChksig: ignoreChecksig })
      const transactions: ParsedTransaction[] = [...(txesRef?.current || [])]

      let shards: AllShardsResponse | undefined
      const getShards = async () => {
        try {
          const masterchainInfo = await blockchainClient.getMasterchainInfo()
          const last = masterchainInfo.last
          shards = (await blockchainClient.getAllShardsInfo(last)) as AllShardsResponse
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
          blockchainClient
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
          let parsed: any
          try {
            parsed = parseWithPayloads(tx.inMessage.body.asSlice())
            if (parsed) {
              ;(tx as any).parsed = parsed
            }
          } catch (err) {
            console.log('error parsing tx', err)
          }
          try {
            const dataParsed = RecursivelyParseCellWithBlock(tx.inMessage.body)
            if (dataParsed) {
              ;(tx as any).parsedRaw = dataParsed
            }
          } catch (err) {
            //
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
          const { blockchain, storage } = await initializeBlockchain(blockchainClient)
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
