import { getPasswordInteractive } from '@/store/passwordManager'
import { useTonConnectState } from '@/store/tonConnect'
import { faQrcode } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { getQrcodeFromScreen } from '../TonConnect/TonConnect'

export function DetectTonConnect() {
  const tonConnectState = useTonConnectState()

  const tryToStartConnect = async () => {
    const code = await getQrcodeFromScreen()
    if (!code) {
      return
    }

    const password = await getPasswordInteractive()
    if (password) {
      tonConnectState.connectArg.set(code)
      tonConnectState.popupOpen.set(true)
    }
  }

  return (
    <div
      onClick={tryToStartConnect}
      className={'cursor-pointer rounded p-1 flex flex-col items-center my-2 text-center '}
    >
      <div
        className="rounded-full w-16 h-16 bg-foreground/5
  flex items-center justify-center text-[32px] text-foreground"
      >
        <FontAwesomeIcon icon={faQrcode} size="xs" />
      </div>
      <div className="text-foreground">TonConnect</div>
    </div>
  )
}
