import { TonConnectMessageRecord } from '@/store/connectMessages'
import { useLiteclient, useLiteclientState } from '@/store/liteClient'
import { useTonConnectSessions } from '@/store/tonConnect'
import { useWalletListState } from '@/store/walletsListState'
import { getWalletFromKey } from '@/utils/wallets'
import { memo, useMemo, useEffect, useState } from 'react'
import { LiteClient } from 'ton-lite-client'
import { AddressRow } from '../AddressRow'
import { Block } from '../ui/Block'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { BocContainer } from '../BocContainer'
import { formatUnits } from '@/utils/units'
import { fetchToncenterTrace, NormalizeMessage } from '@/utils/ton'
import { Cell } from '@ton/core'
import { ToncenterV3Traces } from '@/utils/retracer/traces'
import { Progress } from '@/components/ui/progress'
import { OpenInExplorerButton } from './MessageRow/OpenInExplorerButton'

export const MessageHistoryRow = memo(function MessageHistoryRow({
  connectMessage,
  shouldFetch,
}: {
  connectMessage: TonConnectMessageRecord
  shouldFetch: boolean
}) {
  const keys = useWalletListState()
  const liteClient = useLiteclient() as unknown as LiteClient
  const sessions = useTonConnectSessions()

  const totalAmountOut =
    (connectMessage.message_type === 'tx' &&
      connectMessage?.payload?.messages?.reduce((acc, c) => acc + BigInt(c.amount), 0n)) ||
    0n
  const amountOut = formatUnits(totalAmountOut, 9)

  const key = useMemo(() => {
    return keys.find((k) => k.id.get() === connectMessage.key_id)
  }, [keys])
  if (!key) {
    return <></>
  }

  const wallet = useMemo(
    () => key.wallets.get()?.find((w) => w.id === connectMessage.wallet_id),
    [key]
  )
  if (!wallet) {
    return <></>
  }

  const session = useMemo(
    () => sessions.find((session) => session.id.get() === connectMessage.connect_session_id),
    [sessions]
  )

  const tonWallet = useMemo(
    () => getWalletFromKey(liteClient, key.get(), wallet),
    [liteClient, wallet, key]
  )

  // Normalized message cell for explorer link (if available)
  const explorerCell = useMemo(() => {
    if (connectMessage.message_type !== 'tx' || !connectMessage.message_cell) return undefined
    try {
      const cell = Cell.fromBase64(connectMessage.message_cell)
      return NormalizeMessage(cell)
    } catch {
      return undefined
    }
  }, [connectMessage.message_cell, connectMessage.message_type])

  // ---------------------------------------------------------------------------
  // Pending trace progress (only for messages newer than 1 hour)
  // ---------------------------------------------------------------------------
  const selectedNetworkState = useLiteclientState()
  const [pendingProgress, setPendingProgress] = useState<{ loaded: number; total: number } | null>(
    null
  )

  useEffect(() => {
    if (!shouldFetch) return

    // Only for tx messages with a message cell
    if (connectMessage.message_type !== 'tx' || !connectMessage.message_cell) {
      return
    }

    const messageCell = Cell.fromBase64(connectMessage.message_cell)
    const normalizedMessageCell = NormalizeMessage(messageCell)
    const hashHex = normalizedMessageCell.hash().toString('hex')

    const abortController = new AbortController()
    let intervalId: ReturnType<typeof setInterval> | null = null

    const load = async () => {
      try {
        let traceData: ToncenterV3Traces | null = null
        try {
          traceData = await fetchToncenterTrace({
            hash: hashHex,
            isTestnet: selectedNetworkState.selectedNetwork.get().is_testnet,
            pending: true,
            signal: abortController.signal,
          })
        } catch (e) {
          console.log('error', e)
        }
        if (!traceData?.traces) {
          try {
            traceData = await fetchToncenterTrace({
              hash: hashHex,
              isTestnet: selectedNetworkState.selectedNetwork.get().is_testnet,
              pending: false,
              signal: abortController.signal,
            })
          } catch (e) {
            console.log('error', e)
          }
        }

        console.log('readyTraceData', traceData)
        if (!traceData?.traces || traceData.traces.length === 0) return

        const trace = traceData.traces[0]
        const txs = Object.values(trace.transactions)
        const onChain = txs.filter((t: any) => !t.emulated).length

        setPendingProgress({ loaded: onChain, total: txs.length })

        if (onChain === txs.length && intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
      } catch (_) {
        // ignore errors
      }
    }

    load()

    intervalId = setInterval(() => {
      load()
    }, 1000)

    return () => {
      abortController.abort()
      if (intervalId) clearInterval(intervalId)
    }
  }, [shouldFetch, connectMessage.created_at, connectMessage.message_cell])

  return (
    <Block className="">
      {session?.url.get() && (
        <div className="flex items-center mb-4">
          <Avatar className="w-8 h-8">
            <AvatarImage src={session?.iconUrl.get()} />
            <AvatarFallback>C</AvatarFallback>
          </Avatar>

          <div className="ml-2">{session?.name.get()}</div>
          <a href={session?.url.get()} target="_blank" className="ml-2" rel="noopener noreferrer">
            {session?.url.get()}
          </a>
        </div>
      )}
      <div className="break-keep">
        {
          <AddressRow
            text={<div className="w-40 shrink-0">{`Wallet (${wallet.type}): `}</div>}
            address={tonWallet?.address}
          />
        }
      </div>

      {connectMessage?.message_type === 'tx' && (
        <div className="flex mt-4">
          <div>Messages count:&nbsp;</div>
          <div className="break-words break-all">
            {connectMessage?.payload?.messages?.length} ({amountOut.toString()} TON)
          </div>
        </div>
      )}

      {connectMessage?.message_type === 'tx' && (
        <div className="flex flex-col gap-4">
          <p className="mt-4">Messages:</p>

          {connectMessage?.payload?.messages?.map((m, i) => {
            return (
              <Block key={i}>
                <div className="flex items-center gap-2 w-full overflow-hidden">
                  {/* <div>To:</div> */}
                  <AddressRow
                    text={<div className="w-8 shrink-0">To:</div>}
                    address={m.address}
                    containerClassName="w-full items-center"
                  />
                </div>
                <div>Amount: {m.amount}</div>
                {m.payload && (
                  <div className="flex gap-2 my-2">
                    <BocContainer boc={m.payload} label="Payload" />
                  </div>
                )}
                {m.stateInit && (
                  <div className="flex gap-2">
                    <BocContainer boc={m.stateInit} label="StateInit" />
                  </div>
                )}
              </Block>
            )
          })}
        </div>
      )}

      {pendingProgress && (
        <div className="mt-2 text-sm text-gray-500 w-full">
          <div>
            Transaction progress: {pendingProgress.loaded}/{pendingProgress.total}
            {pendingProgress.loaded === pendingProgress.total ? ' Done' : ''}
          </div>
          {pendingProgress.total > 0 && pendingProgress.loaded < pendingProgress.total && (
            <Progress
              value={(pendingProgress.loaded / pendingProgress.total) * 100}
              className="h-1 mt-1"
            />
          )}
        </div>
      )}

      {explorerCell && (
        <div className="mt-2">
          <OpenInExplorerButton cell={explorerCell} />
        </div>
      )}

      {/* <div>
        <button
          onClick={() => {
            console.log(connectMessage.message_cell)
          }}
        >
          Show message cell
        </button>
      </div> */}
    </Block>
  )
})
