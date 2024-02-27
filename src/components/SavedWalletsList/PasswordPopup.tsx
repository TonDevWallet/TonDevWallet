import { closePasswordPopup, setPassword, usePassword } from '@/store/passwordManager'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useForm } from 'react-hook-form'

type passwordInputs = {
  password: string
}
export function PasswordPopup() {
  const passwordState = usePassword()

  const [isUpdating, setIsUpdating] = useState(false)

  const form = useForm<passwordInputs>({
    defaultValues: {
      password: '',
    },
  })

  useEffect(() => {
    form.reset()
  }, [])

  const onSubmit = async () => {
    try {
      const formPassword = form.getValues('password')
      setIsUpdating(true)
      await setPassword(formPassword)
      form.reset()
      closePasswordPopup()
    } catch (e) {
      console.log('wrong')
      form.setError('password', { message: 'Password is wrong' })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={passwordState.popupOpen.get()}>
      {/* <DialogTrigger>Open</DialogTrigger> */}
      <DialogContent onPointerDownOutside={() => closePasswordPopup()} noClose={true}>
        <DialogHeader>
          <DialogTitle>Enter your password to unlock wallets</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid gap-4 py-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      id="password"
                      className="col-span-3"
                      type="password"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" variant={'default'} disabled={isUpdating}>
                Unlock
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
