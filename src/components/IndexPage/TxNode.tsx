import { bigIntToBuffer } from '@/utils/ton'
import { memo, useMemo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Address, beginCell, Cell, storeTransaction } from '@ton/core'
import { AddressRow } from '../AddressRow'
import { TxNodeData } from './MessageFlow'
import { cn } from '@/utils/cn'
import { useSelectedTx, setSelectedTx } from '@/store/tracerState'
import { WebviewWindow } from '@tauri-apps/api/window'
import Copier from '../copier'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { useAddressInfo } from '@/hooks/useAddressInfo'
import { JettonAmountDisplay } from '../Jettons/Jettons'
import { formatTon, formatUnits } from '@/utils/units'
import { ParsedTransaction } from '@/utils/ManagedBlockchain'
import { stringify } from 'yaml'
import { checkForJettonPayload } from '@/utils/jettonPayload'

const addressColors = [
  // 'bg-secondary',
  'bg-green-900',
  'bg-yellow-900',
  'bg-purple-900',
  'bg-orange-900',
  'bg-teal-900',
  'bg-fuchsia-900',
]

const getAddressColor = (address: Address, addresses: string[]): string => {
  const index = addresses.indexOf(address.toRawString())
  if (index === -1) {
    return 'bg-secondary'
  }
  return addressColors[index % addressColors.length]
}

export const TxNode = memo(({ data }: { data: TxNodeData; id: string }) => {
  const selectedTx = useSelectedTx()

  const tx = data.tx
  const { txAddress, rootAddress, jettonOwnerAddress, addressColor } = useMemo(() => {
    const txAddress = new Address(0, bigIntToBuffer(tx.address))
    const rootAddress = new Address(0, bigIntToBuffer(data.rootTx.address))
    const jettonOwnerAddress = tx.jettonData?.owner

    const addressColor = getAddressColor(jettonOwnerAddress || txAddress, data.addresses)

    return {
      txAddress,
      rootAddress,
      jettonOwnerAddress,
      addressColor,
    }
  }, [tx, data.rootTx])

  const isTxError =
    (tx.description.type === 'generic' &&
      tx.description.computePhase.type === 'vm' &&
      tx.description.computePhase.exitCode !== 0) ||
    (tx.description.type === 'generic' &&
      tx.description.actionPhase &&
      tx.description.actionPhase?.resultCode !== 0) ||
    (tx.description.type === 'generic' && tx.description.bouncePhase?.type)

  const opCode = useMemo(() => {
    if (tx.inMessage?.body) {
      try {
        return tx.inMessage.body.asSlice().preloadUint(32)
      } catch (e) {
        //
      }
    }
    return 0
  }, [tx])

  const notificationErrorCode = useMemo(() => {
    if (tx.inMessage?.body) {
      try {
        const inSlice = tx.inMessage.body.asSlice()
        const op = inSlice.loadUint(32)
        if (op !== 0xf8a7ea5) {
          throw new Error('a')
        }

        inSlice.skip(64) // query id
        inSlice.loadCoins() // amount
        inSlice.loadAddress() // destination
        inSlice.loadAddress() // response_destination
        inSlice.loadMaybeRef() // ?
        inSlice.loadCoins() // forward_ton_amount
        const forward = inSlice.loadMaybeRef()?.asSlice()

        forward?.skip(32)
        forward?.skip(64)

        return forward?.loadUint(32) || 0
      } catch (e) {
        //
      }
    }
    return 0
  }, [tx])

  const addressInfo = useAddressInfo(txAddress)

  const handleClick = () => {
    setSelectedTx(tx)
  }

  return (
    <div
      className={cn(
        'relative p-2 rounded border-2 cursor-pointer transition-all duration-200',
        rootAddress.equals(txAddress) || jettonOwnerAddress?.equals(rootAddress)
          ? 'bg-blue-900 text-white'
          : addressColor + ' text-secondary-foreground',
        isTxError && 'bg-red-900 text-white',
        selectedTx?.value?.lt === tx.lt
          ? 'border-primary ring-8 ring-primary/50'
          : 'border-transparent hover:border-primary/50'
      )}
      onClick={handleClick}
    >
      <AddressRow address={txAddress} />

      {addressInfo && (
        <div className="flex items-center gap-1 text-sm mt-1 mb-2">
          <span className="font-medium">{addressInfo.title}</span>

          {addressInfo.description && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoCircledIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{addressInfo.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      <div>ID: {tx.id}</div>
      <div>LT: {tx.lt.toString()}</div>
      <div>Self Fees: {formatUnits(tx.totalFees.coins, 9)}</div>
      {/* <div>Total Fees: {tonToNumber(tx.gasFull)}</div> */}
      {tx.description.type === 'generic' && tx.description.computePhase.type === 'vm' && (
        <div className="flex items-center gap-2">
          <span>OpCode: 0x{opCode.toString(16)}</span>
          <Copier className="w-5 h-5" text={`0x${opCode.toString(16)}`} />
        </div>
      )}
      {notificationErrorCode ? (
        <div>
          NotificationErrorCode: {notificationErrorCode} {notificationErrorCode.toString(16)}
        </div>
      ) : (
        <></>
      )}
      {tx.description.type === 'generic' && tx.description.computePhase.type === 'vm' && (
        <div>Compute Code: {tx.description.computePhase.exitCode}</div>
      )}
      {tx.description.type === 'generic' && (
        <div>Action Code: {tx.description.actionPhase?.resultCode}</div>
      )}
      {tx.description.type === 'generic' && tx.description.bouncePhase?.type && (
        <div>Bounce Phase Type: {tx.description.bouncePhase?.type}</div>
      )}

      {tx?.parsed?.schema && <div>Schema: {tx.parsed?.schema}</div>}
      {tx?.parsed?.internal && <div>Type: {tx.parsed?.internal}</div>}
      {tx?.parsed?.internal && tx?.parsed?.internal === 'jetton_transfer' && (
        <>
          <div className="flex gap-2">
            Jetton Amount:
            <JettonAmountDisplay
              amount={tx.parsed.data.amount}
              jettonAddress={tx.jettonData?.jettonAddress}
            />
          </div>
          <div>Forward Amount: {formatTon(tx.parsed.data.forward_ton_amount)}</div>
          <div>
            To: <AddressRow address={tx.parsed.data.destination ?? ''} />
          </div>
        </>
      )}
      {tx?.parsed?.internal && tx?.parsed?.internal === 'jetton_internal_transfer' && (
        <>
          <div>Query ID: {tx.parsed.data.query_id.toString()}</div>
          <div className="flex gap-2">
            Jetton Amount:
            <JettonAmountDisplay
              amount={tx.parsed.data.amount}
              jettonAddress={tx.jettonData?.jettonAddress}
            />
          </div>
          <div>Forward Amount: {formatTon(tx.parsed.data.forward_ton_amount)}</div>
        </>
      )}
      {tx?.parsed?.internal && tx?.parsed?.internal === 'jetton_burn' && (
        <>
          <div>Jetton Amount: {tx.parsed.data.amount.toString(10)}</div>
          <div>
            Custom Payload:{' '}
            {tx.parsed.data.custom_payload?.kind === 'Maybe_just' &&
              tx.parsed.data.custom_payload.value.data.toBoc().toString('hex')}
          </div>
        </>
      )}
      {tx?.parsed?.internal && tx?.parsed?.internal === 'jetton_notify' && (
        <>
          <div>Jetton Amount: {tx.parsed.data.amount.toString(10)}</div>
        </>
      )}
      {tx?.parsed?.internal && tx?.parsed?.internal === 'stonfi_deposit_ref_fee_v2' && (
        <>
          <div>Jetton Amount: {tx.parsed.data.jetton_amount.toString(10)}</div>
        </>
      )}
      {tx?.parsed?.internal && tx?.parsed?.internal === 'dedust_swap_peer' && (
        <>
          <div>Jetton Amount: {tx.parsed.data.amount.toString(10)}</div>
        </>
      )}

      <JettonPayloadWrapper tx={tx} />

      <div>
        <button
          onClick={() => {
            const webview = new WebviewWindow(`txinfo:${tx.lt}:${tx.address.toString()}`, {
              focus: true,
              // transparent: true,
              url: '/txinfo',
              center: true,
              title: `Transaction ${tx.lt} ${tx.address.toString()}`,
              height: 800,
              width: 1200,
            })
            // since the webview window is created asynchronously,
            // Tauri emits the `tauri://created` and `tauri://error` to notify you of the creation response
            webview.once('tauri://created', function () {
              setTimeout(() => {
                webview.emit('txinfo', {
                  tx: beginCell().store(storeTransaction(tx)).endCell().toBoc().toString('base64'),
                  vmLogs: (tx as any).vmLogs,
                  debugLogs: (tx as any).debugLogs,
                  blockchainLogs: (tx as any).blockchainLogs,
                })
              }, 1000)
            })
          }}
        >
          Open full tx info
        </button>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        draggable={false}
        isConnectable={false}
        id="b"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        draggable={false}
        className=""
        id="a"
      ></Handle>
    </div>
  )
})

function JettonPayloadWrapper({ tx }: { tx: ParsedTransaction }) {
  // recursively check if we have JettonPayloadWithParsed
  const parsedJettonPayload = useMemo(() => {
    // Check in common locations where payload might exist
    return checkForJettonPayload(tx.parsed)
  }, [tx])

  const sanitizeObject = (obj: any) => {
    if (obj instanceof Cell) {
      return obj.toBoc().toString('hex')
    }

    if (obj instanceof Address) {
      return obj.toString()
    }

    if (obj instanceof Buffer) {
      return obj.toString('hex')
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {}
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = sanitizeObject(obj[key])
        }
      }
      return sanitized
    }

    if (typeof obj === 'bigint') {
      return obj.toString()
    }

    if (typeof obj === 'function') {
      return undefined
    }

    return obj
  }

  return (
    parsedJettonPayload && (
      <div className="flex flex-col gap-3 p-3 my-2 bg-secondary/50 backdrop-blur-sm rounded-lg border border-secondary-foreground/10">
        <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground/80">
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Forward Payload
        </div>
        {parsedJettonPayload.parsed?.data && (
          <div className="relative">
            <div className="max-h-[200px] overflow-y-auto rounded-md bg-secondary/80 p-3 text-secondary-foreground/90 shadow-sm">
              <pre className="whitespace-pre-wrap break-words text-sm font-mono leading-relaxed">
                {stringify(sanitizeObject(parsedJettonPayload.parsed?.data), null, 2)}
              </pre>
            </div>
            <div className="absolute top-0 right-0 p-2">
              <button
                className="p-1.5 rounded-md hover:bg-secondary-foreground/10 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(
                    stringify(sanitizeObject(parsedJettonPayload.parsed?.data), null, 2)
                  )
                }}
                title="Copy payload"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 16H6C4.89543 16 4 15.1046 4 14V6C4 4.89543 4.89543 4 6 4H14C15.1046 4 16 4.89543 16 6V8M10 20H18C19.1046 20 20 19.1046 20 18V10C20 8.89543 19.1046 8 18 8H10C8.89543 8 8 8.89543 8 10V18C8 19.1046 8.89543 20 10 20Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  )
}
