import { setFirstPassword } from '@/store/passwordManager'
import { cn } from '@/utils/cn'
import { useState } from 'react'
import { BlueButton } from './ui/BlueButton'

export function SetPasswordPage() {
  const [pass, setPass] = useState('')
  const [repeatPass, setRepeatPass] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const createPassword = async () => {
    try {
      setIsUpdating(true)
      if (pass.length < 4) {
        setErrorMessage('Passwords must be at least 4 characters')
        return
      }
      if (pass !== repeatPass) {
        setErrorMessage('Password mismatch')
        return
      }

      setErrorMessage('')
      await setFirstPassword(pass)
    } catch (e) {
      console.log('wrong', e)
      setErrorMessage('Wrong password')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-bold">Set password to use wallet</h3>

        <div className="flex flex-col">
          <label htmlFor="passwordInput">Password:</label>
          <input
            id="passwordInput"
            type="password"
            className="mt-1 rounded p-2"
            value={pass}
            autoComplete="off"
            onChange={(e) => setPass(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="passwordInputRepeat">Repeat password:</label>
          <input
            id="passwordInputRepeat"
            type="password"
            className="mt-1 rounded p-2"
            value={repeatPass}
            autoComplete="off"
            onChange={(e) => setRepeatPass(e.target.value)}
          />
        </div>

        <div className="text-sm text-red-500 h-4">{errorMessage}</div>

        <BlueButton
          className={cn('w-full mt-2', isUpdating && 'bg-gray-500')}
          onClick={createPassword}
          disabled={isUpdating}
        >
          Create password
        </BlueButton>
      </div>
    </div>
  )
}
