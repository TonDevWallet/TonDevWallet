import { closePasswordPopup, setPassword, usePassword } from '@/store/passwordManager'
import { useState } from 'react'
import { ReactPopup } from '../Popup'
import { BlueButton } from '../ui/BlueButton'

export function PasswordPopup() {
  const passwordState = usePassword()

  const [pass, setPass] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  return (
    <ReactPopup
      modal
      open={passwordState.popupOpen.get()}
      onOpen={() => setPass('')}
      onClose={closePasswordPopup}
    >
      {(close) => (
        <div className="flex flex-col w-64 p-4">
          <label htmlFor="passwordInput">Enter your password</label>
          <input
            type="password"
            className="mt-2"
            value={pass}
            autoComplete="off"
            onChange={(e) => setPass(e.target.value)}
          />
          <div className="text-sm text-red-500 h-4">{errorMessage}</div>

          <BlueButton
            className="w-full mt-2"
            onClick={async () => {
              try {
                setErrorMessage('')
                await setPassword(pass)
                setPass('')
                close()
              } catch (e) {
                console.log('wrong')
                setErrorMessage('Wrong password')
              }
            }}
          >
            Open
          </BlueButton>
        </div>
      )}
    </ReactPopup>
  )
}
