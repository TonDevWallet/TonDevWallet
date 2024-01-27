import { changeLiteClient, useLiteclient, useLiteclientState } from '@/store/liteClient'
import { useTonConnectSessions } from '@/store/tonConnect'
import { LiteClient } from 'ton-lite-client'
import { useWalletListState } from '@/store/walletsListState'
import { cleanPassword, openPasswordPopup, usePassword } from '@/store/passwordManager'
import { secretKeyToX25519 } from '@/utils/ed25519'
import { KeyPair } from '@ton/crypto'
import { getWalletFromKey } from '@/utils/wallets'
import { IWallet } from '@/types'
import { sendTonConnectStartMessage } from '@/components/TonConnect/TonConnect'
import { DetectTonConnect } from '@/components/SavedWalletsList/DetectTonConnect'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faLockOpen } from '@fortawesome/free-solid-svg-icons'
import { ChangePasswordPopup } from '@/components/SavedWalletsList/ChangePasswordPopup'
import { PasswordPopup } from '@/components/SavedWalletsList/PasswordPopup'
import { cn } from '@/utils/cn'

export function TopBar() {
  const liteClientState = useLiteclientState()
  const sessions = useTonConnectSessions()
  const liteClient = useLiteclient() as LiteClient
  const keys = useWalletListState()
  const passwordState = usePassword()

  const changeLiteClientNetwork = () => {
    changeLiteClient(!liteClientState.testnet.get()).then()
    for (const s of sessions.get()) {
      const key = keys.find((k) => k.id.get() === s.keyId)
      if (!key) {
        return
      }

      const wallet = key.wallets.get()?.find((w) => w.id === s.walletId)
      if (!wallet) {
        return
      }

      const sessionKeyPair = secretKeyToX25519(s.secretKey) as KeyPair

      const tonWallet = getWalletFromKey(liteClient, key.get(), wallet) as IWallet

      const serviceUrl = new URL(s.url)
      const host = serviceUrl.host

      sendTonConnectStartMessage(tonWallet, undefined, host, sessionKeyPair, s.userId)
    }
  }

  return (
    <div className={cn('flex py-2 px-4  gap-4')}>
      <div className="cursor-pointer rounded flex flex-col items-center my-2">
        <label
          className="rounded-full w-16 h-16 bg-foreground/5
            flex flex-col items-center justify-center text-sm cursor-pointer"
          htmlFor="apiKeyInput"
        >
          {/* <label>Testnet:</label> */}
          <div>{liteClientState.testnet.get() ? 'Testnet' : 'Mainnet'}</div>
          <input
            className="hidden"
            type="checkbox"
            id="apiKeyInput"
            checked={liteClientState.testnet.get()}
            onChange={changeLiteClientNetwork}
          />
        </label>
        <div className="text-foreground">Network</div>
      </div>

      <DetectTonConnect />

      {passwordState.password.get() ? (
        <div
          onClick={cleanPassword}
          className={'cursor-pointer rounded flex flex-col items-center my-2 text-center'}
        >
          <div
            className="rounded-full w-16 h-4 bg-foreground/5
            flex flex-col items-center justify-center text-[32px] text-foreground"
          >
            <FontAwesomeIcon icon={faLockOpen} size="xs" />
          </div>
          <div className="text-foreground">Lock wallet</div>
        </div>
      ) : (
        <div
          onClick={openPasswordPopup}
          className={'cursor-pointer rounded flex flex-col items-center my-2 text-center '}
        >
          <div
            className="rounded-full w-16 h-16 bg-foreground/5
            flex items-center justify-center text-[32px] text-foreground"
          >
            <FontAwesomeIcon icon={faLock} size="xs" />
          </div>
          <div className="text-foreground">Unlock wallet</div>
        </div>
      )}

      <ChangePasswordPopup />

      <PasswordPopup />
    </div>
  )
}
