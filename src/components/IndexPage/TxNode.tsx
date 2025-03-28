import { bigIntToBuffer } from '@/utils/ton'
import { memo, useMemo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Address, beginCell, storeTransaction } from '@ton/core'
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
import { sanitizeObject } from '@/utils/tlb/cellParser'

const addressColors = [
  'bg-green-900/90',
  'bg-yellow-900/90',
  'bg-purple-900/90',
  'bg-orange-900/90',
  'bg-teal-900/90',
  'bg-fuchsia-900/90',
]

const getAddressColor = (address: Address, addresses: string[]): string => {
  const index = addresses.indexOf(address.toRawString())
  if (index === -1) {
    return 'bg-secondary/90'
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

  const addressInfo = useAddressInfo(txAddress)

  const handleClick = () => {
    setSelectedTx(tx)
  }

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border-2 cursor-pointer shadow-lg',
        rootAddress.equals(txAddress) || jettonOwnerAddress?.equals(rootAddress)
          ? 'bg-blue-900/95 text-white'
          : addressColor + ' text-secondary-foreground',
        isTxError && 'bg-red-900/95 text-white',
        selectedTx?.value?.lt === tx.lt
          ? 'border-primary ring-4 ring-primary/30'
          : 'border-transparent hover:border-primary/30'
      )}
      onClick={handleClick}
    >
      {/* Header Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs text-secondary-foreground/70">ID</span>
                <span className="font-medium">{tx.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-secondary-foreground/70">LT</span>
                <span className="font-medium">{tx.lt.toString()}</span>
              </div>
            </div>
            {isTxError && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-500/20 text-red-100 text-xs font-medium">
                Error
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              const webview = new WebviewWindow(`txinfo:${tx.lt}:${tx.address.toString()}`, {
                focus: true,
                url: '/txinfo',
                center: true,
                title: `Transaction ${tx.lt} ${tx.address.toString()}`,
                height: 800,
                width: 1200,
              })
              webview.once('tauri://created', function () {
                setTimeout(() => {
                  webview.emit('txinfo', {
                    tx: beginCell()
                      .store(storeTransaction(tx))
                      .endCell()
                      .toBoc()
                      .toString('base64'),
                    vmLogs: (tx as any).vmLogs,
                    debugLogs: (tx as any).debugLogs,
                    blockchainLogs: (tx as any).blockchainLogs,
                  })
                }, 1000)
              })
            }}
            className="
              cursor-pointer px-3 py-1.5 rounded-lg bg-secondary/30 transition-colors text-xs font-medium
              hover:bg-secondary/60
            "
          >
            View Details
          </button>
        </div>
        <AddressRow address={txAddress} />
        {addressInfo && (
          <div className="flex items-center gap-1 text-sm mt-2">
            <span className="font-medium">{addressInfo.title}</span>
            {addressInfo.description && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoCircledIcon className="h-4 w-4 text-muted-foreground/70 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{addressInfo.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex flex-col gap-1 p-2 rounded bg-secondary/30">
          <span className="text-xs text-secondary-foreground/70">Self Fees</span>
          <span className="font-medium text-sm truncate" title={formatUnits(tx.totalFees.coins, 9)}>
            {formatUnits(tx.totalFees.coins, 9)}
          </span>
        </div>
        {tx.description.type === 'generic' && tx.description.computePhase.type === 'vm' && (
          <div className="flex flex-col gap-1 p-2 rounded bg-secondary/30">
            <span className="text-xs text-secondary-foreground/70">OpCode</span>
            <div className="flex items-center gap-2">
              <span
                className="font-medium text-sm font-mono truncate"
                title={`0x${opCode.toString(16)}`}
              >
                0x{opCode.toString(16)}
              </span>
              <Copier
                className="w-4 h-4 opacity-70 hover:opacity-100 flex-shrink-0"
                text={`0x${opCode.toString(16)}`}
              />
            </div>
          </div>
        )}
        {tx.description.type === 'generic' && tx.description.computePhase.type === 'vm' && (
          <div className="flex flex-col gap-1 p-2 rounded bg-secondary/30">
            <span className="text-xs text-secondary-foreground/70">Compute Code</span>
            <span className="font-medium text-sm truncate">
              {tx.description.computePhase.exitCode}
            </span>
          </div>
        )}
        {tx.description.type === 'generic' &&
          tx.description.actionPhase?.resultCode !== undefined && (
            <div className="flex flex-col gap-1 p-2 rounded bg-secondary/30">
              <span className="text-xs text-secondary-foreground/70">Action Code</span>
              <span className="font-medium text-sm truncate">
                {tx.description.actionPhase.resultCode}
              </span>
            </div>
          )}
      </div>

      {/* Schema & Type Info */}
      {(tx?.parsed?.schema || tx?.parsed?.internal) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tx.parsed.schema && (
            <span className="px-2 py-1 rounded-full bg-secondary/30 text-xs font-medium">
              {tx.parsed.schema}
            </span>
          )}
          {tx.parsed.internal && (
            <span className="px-2 py-1 rounded-full bg-primary/30 text-xs font-medium">
              {tx.parsed.internal}
            </span>
          )}
        </div>
      )}

      {/* Jetton Transfer Info */}
      {tx?.parsed?.internal &&
        ['jetton_transfer', 'jetton_internal_transfer', 'jetton_burn', 'jetton_notify'].includes(
          tx.parsed.internal
        ) && (
          <div className="space-y-3 p-3 rounded-lg bg-secondary/30">
            <h4 className="text-sm font-medium">Jetton Information</h4>
            <div className="flex flex-col gap-2 text-sm">
              {tx.parsed.internal === 'jetton_transfer' && (
                <>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-secondary-foreground/70 flex-shrink-0">Amount</span>
                    <div className="overflow-hidden text-right">
                      <JettonAmountDisplay
                        amount={tx.parsed.data.amount}
                        jettonAddress={tx.jettonData?.jettonAddress}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-secondary-foreground/70 flex-shrink-0">
                      Forward Amount
                    </span>
                    <span
                      className="truncate text-right"
                      title={formatTon(tx.parsed.data.forward_ton_amount)}
                    >
                      {formatTon(tx.parsed.data.forward_ton_amount)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-secondary-foreground/70">Destination</span>
                    <div className="overflow-hidden">
                      <div className="truncate">
                        <AddressRow address={tx.parsed.data.destination ?? ''} />
                      </div>
                    </div>
                  </div>
                </>
              )}
              {tx.parsed.internal === 'jetton_internal_transfer' && (
                <>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-secondary-foreground/70 flex-shrink-0">Query ID</span>
                    <span
                      className="truncate text-right font-mono"
                      title={tx.parsed.data.query_id.toString()}
                    >
                      {tx.parsed.data.query_id.toString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-secondary-foreground/70 flex-shrink-0">Amount</span>
                    <div className="overflow-hidden text-right">
                      <JettonAmountDisplay
                        amount={tx.parsed.data.amount}
                        jettonAddress={tx.jettonData?.jettonAddress}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-secondary-foreground/70 flex-shrink-0">
                      Forward Amount
                    </span>
                    <span
                      className="truncate text-right"
                      title={formatTon(tx.parsed.data.forward_ton_amount)}
                    >
                      {formatTon(tx.parsed.data.forward_ton_amount)}
                    </span>
                  </div>
                </>
              )}
              {tx.parsed.internal === 'jetton_burn' && (
                <>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-secondary-foreground/70 flex-shrink-0">Amount</span>
                    <span
                      className="truncate text-right font-mono"
                      title={tx.parsed.data.amount.toString(10)}
                    >
                      {tx.parsed.data.amount.toString(10)}
                    </span>
                  </div>
                  {tx.parsed.data.custom_payload?.kind === 'Maybe_just' && (
                    <div className="flex flex-col gap-1">
                      <span className="text-secondary-foreground/70">Custom Payload</span>
                      <div className="overflow-hidden">
                        <span
                          className="truncate font-mono text-xs block"
                          title={tx.parsed.data.custom_payload.value.data.toBoc().toString('hex')}
                        >
                          {tx.parsed.data.custom_payload.value.data.toBoc().toString('hex')}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
              {tx.parsed.internal === 'jetton_notify' && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-secondary-foreground/70 flex-shrink-0">Amount</span>
                  <span
                    className="truncate text-right font-mono"
                    title={tx.parsed.data.amount.toString(10)}
                  >
                    {tx.parsed.data.amount.toString(10)}
                  </span>
                </div>
              )}
              {tx.parsed.internal === 'stonfi_deposit_ref_fee_v2' && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-secondary-foreground/70 flex-shrink-0">Amount</span>
                  <span
                    className="truncate text-right font-mono"
                    title={tx.parsed.data.jetton_amount.toString(10)}
                  >
                    {tx.parsed.data.jetton_amount.toString(10)}
                  </span>
                </div>
              )}
              {tx.parsed.internal === 'dedust_swap_peer' && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-secondary-foreground/70 flex-shrink-0">Amount</span>
                  <span
                    className="truncate text-right font-mono"
                    title={tx.parsed.data.amount.toString(10)}
                  >
                    {tx.parsed.data.amount.toString(10)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      <JettonPayloadWrapper tx={tx} />
      <RawPayloadWrapper tx={tx} />

      <Handle
        type="target"
        position={Position.Left}
        draggable={false}
        isConnectable={false}
        id="b"
        className="w-3 h-3 bg-secondary border-2 border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        draggable={false}
        className="w-3 h-3 bg-secondary border-2 border-background"
        id="a"
      />
    </div>
  )
})

function JettonPayloadWrapper({ tx }: { tx: ParsedTransaction }) {
  // recursively check if we have JettonPayloadWithParsed
  const parsedJettonPayload = useMemo(() => {
    // Check in common locations where payload might exist
    return checkForJettonPayload(tx.parsed)
  }, [tx])

  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    parsedJettonPayload && (
      <div className="flex flex-col gap-3 p-3 my-2 bg-secondary/50 backdrop-blur-sm rounded-lg">
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
            <div
              className={`${isExpanded ? '' : 'max-h-[200px]'} overflow-y-auto rounded-md bg-secondary/80 p-2 pt-0 text-secondary-foreground/90 shadow-sm relative`}
            >
              <pre className="whitespace-pre-wrap break-words text-sm font-mono leading-relaxed">
                {stringify(sanitizeObject(parsedJettonPayload.parsed?.data), null, 2)}
              </pre>
              {!isExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-secondary/90 to-transparent" />
              )}
            </div>
            <div className="absolute top-0 right-0 p-2">
              <button
                className="p-1.5 rounded-md hover:bg-secondary-foreground/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
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
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand()
              }}
              className="flex items-center justify-center w-full py-1 mt-1 text-xs text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
            >
              {isExpanded ? (
                <>
                  <svg
                    className="w-4 h-4 mr-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 15L12 9L6 15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Collapse
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6 9L12 15L18 9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Expand
                </>
              )}
            </button>
          </div>
        )}
      </div>
    )
  )
}

function RawPayloadWrapper({ tx }: { tx: ParsedTransaction }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    tx.parsedRaw && (
      <div className="flex flex-col gap-3 p-3 my-2 bg-secondary/30 backdrop-blur-sm rounded-lg">
        <div className="flex items-center justify-between gap-2 text-sm font-medium text-secondary-foreground/80">
          <span>Raw Payload</span>
          <button
            className="p-1.5 rounded-md hover:bg-secondary-foreground/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(stringify(sanitizeObject(tx.parsedRaw), null, 2))
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
        <div className="relative">
          <div
            className={`${isExpanded ? '' : 'max-h-[200px]'} overflow-y-auto rounded-md p-2 pt-0 text-secondary-foreground/90 relative`}
          >
            <pre className="whitespace-pre-wrap break-words text-sm font-mono leading-relaxed">
              {stringify(sanitizeObject(tx.parsedRaw), null, 2)}
            </pre>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleExpand()
            }}
            className="cursor-pointer flex items-center justify-center w-full py-1 mt-1 text-xs text-secondary-foreground/70 hover:text-secondary-foreground"
          >
            {isExpanded ? (
              <>
                <svg
                  className="w-4 h-4 mr-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 15L12 9L6 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Collapse
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 9L12 15L18 9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Expand
              </>
            )}
          </button>
        </div>
      </div>
    )
  )
}
