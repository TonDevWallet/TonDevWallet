import { bigIntToBuffer } from '@/utils/ton'
import { memo, useMemo } from 'react'
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

const addressColors = [
  // 'bg-secondary',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-fuchsia-500',
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
          ? 'bg-blue-500 text-white'
          : addressColor + ' text-secondary-foreground',
        isTxError && 'bg-red-500 text-white',
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
      <div>
        <button
          onClick={() => {
            const webview = new WebviewWindow(`txinfo:${tx.lt}:${tx.address.toString()}`, {
              focus: true,
              // transparent: true,
              url: '/txinfo',
              center: true,
              title: `Transaction ${tx.lt} ${tx.address.toString()}`,
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
