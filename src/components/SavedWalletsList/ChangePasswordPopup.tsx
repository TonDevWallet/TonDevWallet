import { useEffect, useState } from 'react'
import {
  DialogHeader,
  DialogFooter,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from '../ui/form'
import { Input } from '../ui/input'
import { useForm } from 'react-hook-form'
import { Button } from '../ui/button'
import { setNewPassword } from '@/store/passwordManager'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey, faLock, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { Alert, AlertDescription } from '../ui/alert'

type ChangePasswordInputs = {
  currentPassword: string
  newPassword: string
  repeatPassword: string
}

export function ChangePasswordPopup() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [open, setOpen] = useState(false)
  const [success, setSuccess] = useState(false)

  const form = useForm<ChangePasswordInputs>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      repeatPassword: '',
    },
  })

  const onSubmit = async () => {
    const currentPassword = form.getValues('currentPassword')
    const newPassword = form.getValues('newPassword')
    const repeatPassword = form.getValues('repeatPassword')
    setSuccess(false)

    try {
      setIsUpdating(true)
      if (!currentPassword) {
        form.setError('currentPassword', { message: 'Current password is required' })
        return
      }
      if (newPassword.length < 4) {
        form.setError('newPassword', { message: 'Password is too short. Minimum 4 symbols' })
        return
      }
      if (newPassword !== repeatPassword) {
        form.setError('repeatPassword', { message: 'Passwords are not the same' })
        return
      }
      await setNewPassword(currentPassword, newPassword)
      setSuccess(true)
      form.reset()
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 2000)
    } catch (e) {
      console.log('password update error', e)
      form.setError('currentPassword', { message: 'Error occurred during update, check passwords' })
    } finally {
      setIsUpdating(false)
    }
  }

  useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [open, form])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FontAwesomeIcon icon={faLock} className="text-lg" />
          <div>
            <p className="text-foreground">Wallet Password</p>
            <p className="text-sm">Change your wallet encryption password</p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="flex gap-2" variant="outline">
              <FontAwesomeIcon icon={faKey} size="sm" />
              Change Password
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FontAwesomeIcon icon={faShieldHalved} className="text-primary" />
                Change Wallet Password
              </DialogTitle>
              <DialogDescription>
                Update the password used to encrypt your wallets
              </DialogDescription>
            </DialogHeader>

            {success ? (
              <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-900 dark:text-green-400">
                <FontAwesomeIcon
                  icon={faKey}
                  className="h-4 w-4 mr-2 text-green-600 dark:text-green-400"
                />
                <AlertDescription>Password successfully updated!</AlertDescription>
              </Alert>
            ) : (
              <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="off"
                            {...field}
                            placeholder="Enter your current password"
                            className="border border-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="new-password"
                            {...field}
                            placeholder="Create a new password"
                            className="border border-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="repeatPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="new-password"
                            {...field}
                            placeholder="Repeat your new password"
                            className="border border-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter className="mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="default" disabled={isUpdating} className="ml-2">
                      {isUpdating ? (
                        <>
                          <FontAwesomeIcon icon={faKey} className="mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faKey} className="mr-2" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
