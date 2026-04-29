import { useFieldArray, useForm } from 'react-hook-form'
import { Form } from '../ui/form'
import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faNetworkWired, faPlus } from '@fortawesome/free-solid-svg-icons'
import {
  getNetworkSourceDbFields,
  updateNetworksList,
  useLiteclientState,
} from '@/store/liteClient'
import { getDatabase } from '@/db'
import { getNetworkBlockchainSource } from '@/types/network'
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
          scanner_url: network.scanner_url,
          toncenter3_url: network.toncenter3_url,
          lite_engine_host_mode: network.lite_engine_host_mode || 'auto',
          lite_engine_host_custom: network.lite_engine_host_custom || '',
          blockchain_source: getNetworkBlockchainSource(network),
          tonapi_url: network.tonapi_url || '',
          tonapi_token: network.tonapi_token || '',
          toncenter_token: network.toncenter_token || '',
          chain_id: network.chain_id ?? undefined,
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
        scanner_url: network.scanner_url,
        toncenter3_url: network.toncenter3_url,
        lite_engine_host_mode: network.lite_engine_host_mode || 'auto',
        lite_engine_host_custom: network.lite_engine_host_custom || '',
        blockchain_source: getNetworkBlockchainSource(network),
        tonapi_url: network.tonapi_url || '',
        tonapi_token: network.tonapi_token || '',
        toncenter_token: network.toncenter_token || '',
        chain_id: network.chain_id ?? undefined,
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
        const sourceFields = getNetworkSourceDbFields({
          blockchain_source: network.blockchain_source,
        })
        await db.execute(
          `
            UPDATE networks
            SET
              name = ?,
              url = ?,
              is_testnet = ?,
              scanner_url = ?,
              toncenter3_url = ?,
              lite_engine_host_mode = ?,
              lite_engine_host_custom = ?,
              blockchain_source = ?,
              tonapi_url = ?,
              tonapi_token = ?,
              toncenter_token = ?,
              chain_id = ?
            WHERE network_id = ?
          `,
          [
            network.name,
            network.url,
            network.is_testnet,
            network.scanner_url,
            network.toncenter3_url,
            network.lite_engine_host_mode || 'auto',
            network.lite_engine_host_custom || '',
            sourceFields.blockchain_source,
            network.tonapi_url || '',
            network.tonapi_token ?? '',
            network.toncenter_token ?? '',
            network.chain_id ?? null,
            network.network_id,
          ]
        )
      }
      await updateNetworksList()
    })
    return () => subscription.unsubscribe()
  }, [form])

  const addCustomNetwork = async () => {
    setIsAdding(true)
    try {
      const db = await getDatabase()
      await db.execute(
        `
          INSERT INTO networks (
            name,
            url,
            item_order,
            is_default,
            is_testnet,
            scanner_url,
            toncenter3_url,
            lite_engine_host_mode,
            lite_engine_host_custom,
            blockchain_source,
            tonapi_url,
            tonapi_token,
            toncenter_token,
            chain_id,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          `Custom network #${fields.length}`,
          'https://ton-blockchain.github.io/global.config.json',
          fields.length + 1,
          false,
          false,
          'https://tonviewer.com/',
          '',
          'auto',
          '',
          'liteclient',
          '',
          '',
          '',
          null,
          new Date(),
          new Date(),
        ]
      )
      await updateNetworksList()
    } finally {
      setIsAdding(false)
    }
  }

  const removeField = async (field: NetworkSettingsProps) => {
    const db = await getDatabase()
    await db.execute('DELETE FROM networks WHERE network_id = ?', [field.network_id])
    await updateNetworksList()
  }

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pt-6 pb-6">
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
