import { getPasswordInteractive } from '@/store/passwordManager'
import { useTonConnectState } from '@/store/tonConnect'
import { faPaste, faQrcode } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { getQrcodeFromScreen } from '../TonConnect/TonConnect'
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from '../ui/dialog'
// import { useState } from 'react'
import { Card, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function DetectTonConnect() {
  // const [open, setOpen] = useState(false)
  const connectState = useTonConnectState()

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
    <Dialog
      open={connectState.qrcodeOpen.get()}
      onOpenChange={(v) => {
        console.log('onOpenChange', v)
        connectState.qrcodeOpen.set(v)
      }}
    >
      {/* Add dialog trigger */}
      <DialogTrigger asChild>
        <button className={'cursor-pointer rounded flex flex-col items-center my-2 text-center'}>
          <div
            className="rounded-full px-4 h-8 relative
              flex items-center justify-center text-sm cursor-pointer text-foreground gap-2"
          >
            <FontAwesomeIcon icon={faQrcode} size="xs" />
            <div className="hidden lg:block text-foreground">TonConnect</div>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent noClose>
        <DialogHeader>Connect to DApp</DialogHeader>

        <Card className={'hover:bg-secondary'}>
          <button className={'flex text-left items-center'} onClick={tryToStartConnect}>
            <FontAwesomeIcon icon={faQrcode} size="2x" className={'ml-4'} />
            <div className="flex flex-col">
              <CardHeader>
                Scan screen for TonConnect QR Codes
                <CardDescription>
                  Wallet will be hidden for a second. It will take screenshot and will try to
                  connect, if QR Code found
                </CardDescription>
              </CardHeader>
            </div>
          </button>
        </Card>

        <Card>
          <button className={'flex text-left items-center'}>
            <FontAwesomeIcon icon={faPaste} size="2x" className={'ml-4'} />
            <div className="flex flex-col">
              <CardHeader>
                Paste connect link manually
                <CardDescription>
                  <Label htmlFor={'connectInput'}>
                    You can paste text, or image of the QR Code.
                  </Label>
                  <Input id={'connectInput'} />
                </CardDescription>
              </CardHeader>
            </div>
          </button>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
