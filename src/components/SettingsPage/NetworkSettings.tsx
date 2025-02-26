import { useFieldArray, useForm } from 'react-hook-form'
import { Form } from '../ui/form'
import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faNetworkWired, faPlus } from '@fortawesome/free-solid-svg-icons'
import { updateNetworksList, useLiteclientState } from '@/store/liteClient'
import { getDatabase } from '@/db'
import { Network } from '@/types/network'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import NetworkRow, { NetworkSettingsProps } from './NetworkRow'

function NetworkSettings() {
  const liteClientState = useLiteclientState()
  const [isAdding, setIsAdding] = useState(false)

  const form = useForm<{
    networks: NetworkSettingsProps[]
  }>({
    defaultValues: {
      networks: liteClientState.networks.get().map((network) => {
        return {
          name: network.name,
          url: network.url,
          is_default: network.is_default,
          network_id: network.network_id,
          is_testnet: network.is_testnet,
        }
      }),
    },
  })

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
        is_testnet: network.is_testnet,
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
          is_testnet: network.is_testnet,
        })
      }
      await updateNetworksList()
    })
    return () => subscription.unsubscribe()
  }, [form])

  const addCustomNetwork = async () => {
    setIsAdding(true)
    try {
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
    } finally {
      setIsAdding(false)
    }
  }

  const removeField = async (field: NetworkSettingsProps) => {
    const db = await getDatabase()
    await db<Network>('networks').where('network_id', field.network_id).delete()
    await updateNetworksList()
  }

  return (
    <div className="space-y-6">
      <Card className="border shadow overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-3">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faNetworkWired} className="text-primary" />
            <div>
              <CardTitle className="text-lg">Network Configurations</CardTitle>
              <CardDescription>Configure blockchain networks for your wallet</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <div className="space-y-5">
              {fields.map((field, index) => (
                <NetworkRow
                  key={field.id}
                  field={field}
                  index={index}
                  control={form.control}
                  watch={form.watch}
                  onRemove={removeField}
                />
              ))}
            </div>
          </Form>

          <div className="mt-6">
            <Button onClick={addCustomNetwork} className="w-full sm:w-auto" disabled={isAdding}>
              <FontAwesomeIcon icon={faPlus} className={`mr-2 ${isAdding ? 'animate-spin' : ''}`} />
              {isAdding ? 'Adding...' : 'Add Custom Network'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default NetworkSettings
