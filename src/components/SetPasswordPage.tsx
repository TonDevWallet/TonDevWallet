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
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="flex flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">Set password to use wallet</h3>

        <form onSubmit={createPassword}>
          <div className="flex flex-col">
            <label htmlFor="passwordInput" className="text-gray-700 dark:text-gray-300">Password:</label>
            <Input
              id="passwordInput"
              type="password"
              className="mt-1 rounded p-2 border border-gray-300 dark:border-gray-600"
              value={pass}
              autoComplete="off"
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          <div className="flex flex-col mt-2">
            <label htmlFor="passwordInputRepeat" className="text-gray-700 dark:text-gray-300">Repeat password:</label>
            <Input
              id="passwordInputRepeat"
              type="password"
              className="mt-1 rounded p-2 border border-gray-300 dark:border-gray-600"
              value={repeatPass}
              autoComplete="off"
              onChange={(e) => setRepeatPass(e.target.value)}
            />
          </div>

          <div className="text-sm text-red-500 h-4 mt-2">{errorMessage}</div>

          <BlueButton
            className={cn('w-full mt-4', isUpdating && 'bg-gray-500')}
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
