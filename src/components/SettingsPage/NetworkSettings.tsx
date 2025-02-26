import { useFieldArray, useForm } from 'react-hook-form'
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form'
import { Input } from '../ui/input'
import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGlobe, faNetworkWired, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { updateNetworksList, useLiteclientState } from '@/store/liteClient'
import { getDatabase } from '@/db'
import { Network } from '@/types/network'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { cn } from '@/utils/cn'
import { Switch } from '../ui/switch'

interface NetworkSettingsProps {
  name: string
  url: string
  is_default: boolean
  network_id: number
  is_testnet: boolean
}

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
              {fields.map((field, index) => {
                return (
                  <div
                    key={field.id}
                    className={cn(
                      'bg-card/50 rounded-lg border-2 border-border/50 hover:border-primary/20 transition-all p-4 group',
                      form.watch(`networks.${index}.is_testnet`)
                        ? 'bg-blue-50/50 dark:bg-blue-950/10'
                        : ''
                    )}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'bg-primary/10 rounded-full p-2 w-8 h-8 flex items-center justify-center',
                            form.watch(`networks.${index}.is_testnet`)
                              ? 'bg-blue-100 dark:bg-blue-900/30'
                              : ''
                          )}
                        >
                          <FontAwesomeIcon
                            icon={faGlobe}
                            className={cn(
                              'text-primary',
                              form.watch(`networks.${index}.is_testnet`)
                                ? 'text-blue-600 dark:text-blue-400'
                                : ''
                            )}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <FormField
                              control={form.control}
                              name={`networks.${index}.name`}
                              render={({ field }) => (
                                <FormItem className="w-full mb-0">
                                  <FormControl>
                                    <Input
                                      placeholder="Network Name"
                                      {...field}
                                      className="border-0 px-0 outline-none focus-visible:ring-0 w-full font-semibold text-lg"
                                      spellCheck={false}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">ID: {field.network_id}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <FormField
                            control={form.control}
                            name={`networks.${index}.is_testnet`}
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    id={`network-testnet-switch-${index}`}
                                  />
                                </FormControl>
                                <Label
                                  htmlFor={`network-testnet-switch-${index}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  Testnet
                                </Label>
                              </FormItem>
                            )}
                          />
                        </div>

                        {!field.is_default && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeField(field)}
                                  className="opacity-50 hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30 transition-all"
                                >
                                  <FontAwesomeIcon icon={faTrash} size="sm" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Remove network</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label
                        htmlFor={`networks.${index}.url`}
                        className="text-sm font-medium mb-1.5 block"
                      >
                        Configuration URL
                      </Label>
                      <FormField
                        control={form.control}
                        name={`networks.${index}.url`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Enter configuration URL"
                                {...field}
                                spellCheck={false}
                                className="w-full"
                                id={`networks.${index}.url`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )
              })}
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
