import { closePasswordPopup, setPassword, usePassword } from '@/store/passwordManager'
import { cn } from '@/utils/cn'
import { useEffect, useState } from 'react'
import { ReactPopup } from '../Popup'
import { BlueButton } from '../ui/BlueButton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashCan } from '@fortawesome/free-solid-svg-icons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useForm, SubmitHandler } from 'react-hook-form'

type passwordInputs = {
  password: string
}
export function PasswordPopup() {
  const passwordState = usePassword()

  const [pass, setPass] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const form = useForm<passwordInputs>()

  useEffect(() => {
    form.reset()
  }, [])
  // const onSubmit: SubmitHandler<Inputs> = (data) => console.log(data)

  const onSubmit = async () => {
    // e.preventDefault()
    try {
      const formPassword = form.getValues('password')

      console.log('submit', form, formPassword)
      setIsUpdating(true)
      // setErrorMessage('')
      await setPassword(formPassword)
      form.reset()
      closePasswordPopup()
      // setPass('')
      // close()
    } catch (e) {
      console.log('wrong')
      // setErrorMessage('Wrong password')
      form.setError('password', { message: 'Password is wrong' })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={passwordState.popupOpen.get()} onOpenChange={() => setPass('')}>
      {/* <DialogTrigger>Open</DialogTrigger> */}
      <DialogContent onPointerDownOutside={() => closePasswordPopup()} noClose={true}>
        <DialogHeader>
          <DialogTitle>Enter your password to unlock wallets</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        {/*  */}
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
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )

  // <ReactPopup
  //   modal
  //   open={passwordState.popupOpen.get()}
  //   onOpen={() => setPass('')}
  //   onClose={closePasswordPopup}
  // >
  //   {(close) => (
  //     <form className="flex flex-col w-64 p-4" onSubmit={(e) => onSubmit(e, close)}>
  //       <label htmlFor="passwordInput">Enter your password</label>
  //       <input
  //         type="password"
  //         className="mt-2 rounded px-2"
  //         value={pass}
  //         autoComplete="off"
  //         onChange={(e) => setPass(e.target.value)}
  //       />
  //       <div className="text-sm text-red-500 h-4">{errorMessage}</div>
  //
  //       <BlueButton
  //         disabled={isUpdating}
  //         className={cn('w-full mt-2', isUpdating && 'bg-gray-500')}
  //         type="submit"
  //       >
  //         Open
  //       </BlueButton>
  //     </form>
  //   )}
  // </ReactPopup>
  // )
}
