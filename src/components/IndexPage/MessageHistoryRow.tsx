import { TonConnectMessageRecord } from '@/store/connectMessages'
import { useLiteclient } from '@/store/liteClient'
import { useTonConnectSessions } from '@/store/tonConnect'
import { useWalletListState } from '@/store/walletsListState'
import { getWalletFromKey } from '@/utils/wallets'
import { memo, useMemo } from 'react'
import { LiteClient } from 'ton-lite-client'
import { AddressRow } from '../AddressRow'
import { Block } from '../ui/Block'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { BocContainer } from '../BocContainer'
import { formatUnits } from '@/utils/units'

export const MessageHistoryRow = memo(function MessageHistoryRow({
  connectMessage,
}: {
  connectMessage: TonConnectMessageRecord
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

  // const messageHash = useMemo(() => {
  //   return connectMessage.message_cell
  //     ? Cell.fromBase64(connectMessage.message_cell).hash()
  //     : undefined
  // }, [connectMessage.message_cell])

  // const [tonapiTx, setTonapiTx] = useState<any>(null)
  // const tonapiClient = useTonapiClient()

  // useEffect(() => {
  //   if (messageHash) {
  //     const f = async () => {
  //       const trace = await tonapiClient?.traces.getTrace(messageHash.toString('hex'))
  //       console.log('trace', trace)
  //     }
  //     f()
  //   }
  // }, [messageHash])

  // console.log('messageHash', messageHash)

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
