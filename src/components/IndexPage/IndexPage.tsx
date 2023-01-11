import { useLiteclient } from '@/store/liteClient'
import { deleteTonConnectSession, useTonConnectSessions } from '@/store/tonConnect'
import { useWalletListState } from '@/store/walletsListState'
import { getWalletFromKey } from '@/utils/wallets'
import { LiteClient } from 'ton-lite-client'
import { BlueButton } from '../UI'

export function IndexPage() {
  const sessions = useTonConnectSessions()
  const keys = useWalletListState()
  const liteClient = useLiteclient() as unknown as LiteClient

  return (
    <div className="p-2">
      Index
      <div>
        Sessions:
        {sessions.map((s) => {
          const key = keys.find((k) => k.id.get() === s.keyId.get())
          if (!key) {
            return <></>
          }

          const wallet = key.wallets.get()?.find((w) => w.id === s.walletId.get())
          if (!wallet) {
            return <></>
          }

          const tonWallet = getWalletFromKey(liteClient, key, wallet)

          return (
            <div>
              <div className="flex">
                <div>SessionID:&nbsp;</div>
                <div>{s.userId.get()}</div>
              </div>

              <div className="flex">
                <div>Key:&nbsp;</div>
                <div>{JSON.stringify(wallet)}</div>
              </div>

              <div className="flex">
                <div>Address:&nbsp;</div>
                <div>{tonWallet?.address.toString()}</div>
              </div>

              <div className="flex">
                <div>Delete:&nbsp;</div>
                <BlueButton
                  onClick={() => {
                    deleteTonConnectSession(s.id.get())
                  }}
                >
                  Delete
                </BlueButton>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
