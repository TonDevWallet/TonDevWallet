import { bigIntToBuffer } from '@/utils/ton'
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Address, beginCell, storeTransaction } from '@ton/core'
import { AddressRow } from '../AddressRow'
import { TxNodeData } from './MessageFlow'
import { cn } from '@/utils/cn'
import { useSelectedTx, setSelectedTx } from '@/store/tracerState'
import { WebviewWindow } from '@tauri-apps/api/window'
import Copier from '../copier'

export const TxNode = memo(({ data }: { data: TxNodeData; id: string }) => {
  const selectedTx = useSelectedTx()

  const tx = data.tx
  const txAddress = new Address(0, bigIntToBuffer(tx.address))
  const rootAddress = new Address(0, bigIntToBuffer(data.rootTx.address))

  const isTxError =
    (tx.description.type === 'generic' &&
      tx.description.computePhase.type === 'vm' &&
      tx.description.computePhase.exitCode !== 0) ||
    (tx.description.type === 'generic' &&
      tx.description.actionPhase &&
      tx.description.actionPhase?.resultCode !== 0) ||
    (tx.description.type === 'generic' && tx.description.bouncePhase?.type)

  let opCode = 0
  if (tx.inMessage?.body) {
    try {
      opCode = tx.inMessage.body.asSlice().preloadUint(32)
    } catch (e) {
      //
    }
  }

  let notificationErrorCode = 0
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

      notificationErrorCode = forward?.loadUint(32) || 0
    } catch (e) {
      //
    }
  }

  const handleClick = () => {
    setSelectedTx(tx)
  }

  return (
    <div
      className={cn(
        'p-2 rounded border-2 cursor-pointer transition-all duration-200',
        rootAddress.equals(txAddress)
          ? 'bg-blue-500 text-white'
          : 'bg-secondary text-secondary-foreground',
        isTxError && 'bg-red-500 text-white',
        selectedTx?.value?.lt === tx.lt
          ? 'border-primary ring-8 ring-primary/50'
          : 'border-transparent hover:border-primary/50'
      )}
      onClick={handleClick}
    >
      <AddressRow address={txAddress} />
      <div>ID: {tx.id}</div>
      <div>LT: {tx.lt.toString()}</div>
      <div>Self Fees: {Number(tx.totalFees.coins) / 10 ** 9}</div>
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
          <div>Jetton Amount: {tx.parsed.data.amount.toString()}</div>
          <div>Forward Amount: {tx.parsed.data.forward_ton_amount.toString()}</div>
          <div>
            To: <AddressRow address={tx.parsed.data.destination ?? ''} />
          </div>
        </>
      )}
      {tx?.parsed?.internal && tx?.parsed?.internal === 'jetton_internal_transfer' && (
        <>
          <div>Jetton Amount: {tx.parsed.data.amount.toString()}</div>
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
