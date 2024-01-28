import { setFirstPassword } from '@/store/passwordManager'
import { cn } from '@/utils/cn'
import { useState } from 'react'
import { BlueButton } from './ui/BlueButton'
import { Input } from './ui/input'

export function SetPasswordPage() {
  const [pass, setPass] = useState('')
  const [repeatPass, setRepeatPass] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const createPassword = async (event) => {
    event.preventDefault()
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
      console.log('password create error', e)
      setErrorMessage('Wrong password')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-bold">Set password to use wallet</h3>

        <form onSubmit={createPassword}>
          <div className="flex flex-col">
            <label htmlFor="passwordInput">Password:</label>
            <Input
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
            <Input
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
            type="submit"
            disabled={isUpdating}
          >
            Create password
          </BlueButton>
        </form>
      </div>
    </div>
  )
}
