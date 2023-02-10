import { setNewPassword } from '@/store/passwordManager'
import { cn } from '@/utils/cn'
import { faHashtag } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'
import { ReactPopup } from '../Popup'
import { BlueButton } from '../ui/BlueButton'

export function ChangePasswordPopup() {
  const [pass, setPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [repeatPas, setRepeatPass] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const onOpen = () => {
    setPass('')
    setNewPass('')
    setRepeatPass('')
  }

  return (
    <ReactPopup
      modal
      trigger={
        <div className={'cursor-pointer rounded p-1 flex flex-col items-center my-2 text-center '}>
          <div
            className="rounded-full w-16 h-16 bg-foreground/5
        flex items-center justify-center text-[32px] text-foreground"
          >
            <FontAwesomeIcon icon={faHashtag} size="xs" />
          </div>
          <div className="text-foreground">Change password</div>
        </div>
      }
      onOpen={onOpen}
    >
      {(close) => (
        <div className="flex flex-col w-64 p-4">
          <div>
            <label htmlFor="passwordInput">Enter current password</label>
            <input
              id="passwordInput"
              type="password"
              className="mt-2 px-2"
              value={pass}
              autoComplete="off"
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="passwordInputNew">Enter new password</label>
            <input
              id="passwordInputNew"
              type="password"
              className="mt-2 px-2"
              value={newPass}
              autoComplete="off"
              onChange={(e) => setNewPass(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="passwordInputRepeat">Repeat new password</label>
            <input
              id="passwordInputRepeat"
              type="password"
              className="mt-2 px-2"
              value={repeatPas}
              autoComplete="off"
              onChange={(e) => setRepeatPass(e.target.value)}
            />
          </div>

          <div className="text-sm text-red-500 h-4">{errorMessage}</div>

          <BlueButton
            className={cn('w-full mt-2', isUpdating && 'bg-gray-500')}
            onClick={async () => {
              try {
                setIsUpdating(true)
                if (newPass !== repeatPas || newPass.length < 4) {
                  setErrorMessage('Wrong new password')
                  return
                }
                setErrorMessage('')
                await setNewPassword(pass, newPass)
                setPass('')
                close()
              } catch (e) {
                console.log('wrong')
                setErrorMessage('Wrong password')
              } finally {
                setIsUpdating(false)
              }
            }}
            disabled={isUpdating}
          >
            Update password
          </BlueButton>
        </div>
      )}
    </ReactPopup>
  )
}
