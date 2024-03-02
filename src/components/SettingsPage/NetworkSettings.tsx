import { useFieldArray, useForm } from 'react-hook-form'
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form'
import { Input } from '../ui/input'
import { useEffect } from 'react'
import { Button } from '../ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import { updateNetworksList, useLiteclientState } from '@/store/liteClient'
import { getDatabase } from '@/db'
import { Network } from '@/types/network'

function NetworkSettings() {
  const liteClientState = useLiteclientState()
  const form = useForm<{
    networks: { name: string; url: string; is_default: boolean; network_id: number }[]
  }>({})
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'networks',
  })

  useEffect(() => {
    if (fields.length === liteClientState.networks.length) {
      return
    }

    remove()

    for (const network of liteClientState.networks.get()) {
      append({
        name: network.name,
        url: network.url,
        is_default: network.is_default,
        network_id: network.network_id,
      })
    }
  }, [liteClientState.networks])

  useEffect(() => {
    const subscription = form.watch(async (value) => {
      if (!value.networks) {
        return
      }

      const db = await getDatabase()
      for (const network of value.networks) {
        if (!network) {
          continue
        }
        await db<Network>('networks').where('network_id', network.network_id).update({
          name: network.name,
          url: network.url,
        })
      }
      await updateNetworksList()
    })
    return () => subscription.unsubscribe()
  }, [form])

  const addCustomNetwork = async () => {
    const db = await getDatabase()
    await db<Network>('networks').insert({
      name: `Custom network #${fields.length}`,
      url: 'https://ton-blockchain.github.io/global.config.json',
      item_order: fields.length + 1,
      is_default: false,
      is_testnet: false,
      scanner_url: 'https://tonviewer.com/',

      created_at: new Date(),
      updated_at: new Date(),
    })
    await updateNetworksList()
  }

  const removeField = async (field: {
    name: string
    url: string
    is_default: boolean
    network_id: number
  }) => {
    const db = await getDatabase()
    await db<Network>('networks').where('network_id', field.network_id).delete()
    await updateNetworksList()
  }

  return (
    <div>
      <h2 className="mt-10 scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight transition-colors">
        Networks Settings
      </h2>

      {/* <p className="mt-4">asd</p> */}

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
                        <FormControl>
                          <Input
                            placeholder="shadcn"
                            {...field}
                            className="border-0 px-0 outline-none focus-visible:ring-0"
                            spellCheck={false}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {!field.is_default && (
                    <div onClick={() => removeField(field)} className="cursor-pointer">
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

export default NetworkSettings
