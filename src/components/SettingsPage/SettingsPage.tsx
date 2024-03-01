import { useFieldArray, useForm } from 'react-hook-form'
import {
  Form,
  FormControl,
  // FormDescription,
  FormField,
  FormItem,
  // FormLabel,
  FormMessage,
} from '../ui/form'
import { Input } from '../ui/input'
import { useEffect } from 'react'
import { Button } from '../ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import { useLiteclientState } from '@/store/liteClient'

export function SettingsPage() {
  const liteClientState = useLiteclientState()
  const form = useForm<{
    networks: { name: string; url: string; isDefault: boolean }[]
  }>({})
  const { fields, append, remove } = useFieldArray({
    control: form.control, // control props comes from useForm (optional: if you are using FormContext)
    name: 'networks',
    // name: 'test', // unique name for your Field Array
  })

  useEffect(() => {
    if (fields.length !== 0) {
      return
    }

    for (const network of liteClientState.networks.get()) {
      append({
        name: network.name,
        url: network.url,
        isDefault: network.is_default,
      })
    }
    // append({
    //   name: 'Mainnet',
    //   value: 'https://ton-blockchain.github.io/global.config.json',
    //   isDefault: true,
    // })
    // append({
    //   name: 'Testnet',
    //   value: 'https://ton-blockchain.github.io/testnet-global.config.json',
    //   isDefault: true,
    // })
  }, [])

  useEffect(() => {
    console.log('fields', fields)
  }, [fields])

  useEffect(() => {
    console.log('qq', form.getValues())
  }, [form.getValues()])

  const addCustomNetwork = () => {
    append({
      name: `Custom network #${fields.length}`,
      url: 'https://ton-blockchain.github.io/global.config.json',
      isDefault: false,
    })
  }
  return (
    <div>
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-4xl">Settings</h1>

      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-2xl mt-4">
        Networks
      </h1>

      {/* <div>Data: {JSON.stringify(form.getValues())}</div> */}

      <Form {...form}>
        <div className="flex flex-col gap-4">
          {fields.map((field, index) => {
            console.log('render field', field)
            return (
              <div key={field.id}>
                <div className="flex justify-between items-center">
                  <FormField
                    control={form.control}
                    name={`networks.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        {/* <FormLabel>{field.value}</FormLabel> */}
                        <FormControl>
                          <Input
                            placeholder="shadcn"
                            {...field}
                            className="border-0 px-0 outline-none focus-visible:ring-0"
                            spellCheck={false}
                          />
                        </FormControl>
                        {/* <FormDescription>This is your public display name.</FormDescription> */}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {!field.isDefault && (
                    <div
                      onClick={() => {
                        remove(index)
                      }}
                      className="cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faTrash} size="xs" />
                    </div>
                  )}
                </div>
                <FormField
                  control={form.control}
                  name={`networks.${index}.url`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="shadcn" {...field} spellCheck={false} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )
          })}
        </div>
      </Form>

      <Button className="mt-4" onClick={addCustomNetwork}>
        Add Network
      </Button>
    </div>
  )
}
