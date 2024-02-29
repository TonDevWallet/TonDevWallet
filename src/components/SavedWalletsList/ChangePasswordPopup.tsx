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
import { faHashtag } from '@fortawesome/free-solid-svg-icons'

type ChangePasswordInputs = {
  currentPassword: string
  newPassword: string
  repeatPassword: string
}

export function ChangePasswordPopup() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [open, setOpen] = useState(false)

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
      setOpen(false)
    } catch (e) {
      console.log('password update error', 3)
      form.setError('currentPassword', { message: 'Error occured during update, check passwords' })
    } finally {
      setIsUpdating(false)
    }
  }

  useEffect(() => {
    form.reset()
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <div className={'cursor-pointer rounded flex flex-col items-center my-2 text-center'}>
          <div
            className="rounded-full px-4 h-8 relative
              flex items-center justify-center text-sm cursor-pointer text-foreground gap-2"
          >
            <FontAwesomeIcon icon={faHashtag} size="xs" />
            <div className="text-foreground">Change password</div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent noClose={true}>
        <DialogHeader>
          <DialogTitle>Enter your password to unlock wallets</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        {/*  */}
        <Form {...form}>
          <form className="grid gap-4 py-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="off" {...field} />
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
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="off" {...field} />
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
                  <FormLabel>Repeat New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" variant={'default'} disabled={isUpdating}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
