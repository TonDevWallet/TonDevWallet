import { closePasswordPopup, setPassword, usePassword } from '@/store/passwordManager'
import { cn } from '@/utils/cn'
import { useState } from 'react'
import { ReactPopup } from '../Popup'
import { BlueButton } from '../ui/BlueButton'

export function PasswordPopup() {
  const passwordState = usePassword()

  const [pass, setPass] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const onSubmit = async (e, close) => {
    e.preventDefault()
    try {
      setIsUpdating(true)
      setErrorMessage('')
      await setPassword(pass)
      setPass('')
      close()
    } catch (e) {
      console.log('wrong')
      setErrorMessage('Wrong password')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <ReactPopup
      modal
      open={passwordState.popupOpen.get()}
      onOpen={() => setPass('')}
      onClose={closePasswordPopup}
    >
      {(close) => (
        <form className="flex flex-col w-64 p-4" onSubmit={(e) => onSubmit(e, close)}>
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
            disabled={isUpdating}
            className={cn('w-full mt-2', isUpdating && 'bg-gray-500')}
            type="submit"
          >
            Open
          </BlueButton>
        </form>
      )}
    </ReactPopup>
  )
}
