import { Control, UseFormWatch } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormMessage } from '../ui/form'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGlobe, faTrash } from '@fortawesome/free-solid-svg-icons'
import { Label } from '../ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { cn } from '@/utils/cn'
import { MAINNET_CHAIN_ID, TESTNET_CHAIN_ID } from '@/types/network'
import { Switch } from '../ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import NetworkTestButton from './NetworkTestButton'

export interface NetworkSettingsProps {
  name: string
  url: string
  is_default: boolean
  network_id: number
  is_testnet: boolean
  scanner_url?: string
  toncenter3_url?: string
  lite_engine_host_mode?: 'auto' | 'custom'
  lite_engine_host_custom?: string
  use_tonapi_only?: boolean
  tonapi_url?: string
  chain_id?: number | null
}

// NetworkRow component
interface NetworkRowProps {
  field: NetworkSettingsProps & { id: string }
  index: number
  control: Control<{ networks: NetworkSettingsProps[] }>
  watch: UseFormWatch<{ networks: NetworkSettingsProps[] }>
  onRemove: (field: NetworkSettingsProps) => Promise<void>
}

const NetworkRow = ({ field, index, control, watch, onRemove }: NetworkRowProps) => {
  return (
    <div
      className={cn(
        'bg-card/50 rounded-lg border-2 border-border/50 hover:border-primary/20 transition-all p-4 group',
        watch(`networks.${index}.is_testnet`) ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'bg-primary/10 rounded-full p-2 w-8 h-8 flex items-center justify-center',
              watch(`networks.${index}.is_testnet`) ? 'bg-blue-100 dark:bg-blue-900/30' : ''
            )}
          >
            <FontAwesomeIcon
              icon={faGlobe}
              className={cn(
                'text-primary',
                watch(`networks.${index}.is_testnet`) ? 'text-blue-600 dark:text-blue-400' : ''
              )}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <FormField
                control={control}
                name={`networks.${index}.name`}
                render={({ field: nameField }) => (
                  <FormItem className="w-full mb-0">
                    <FormControl>
                      <Input
                        placeholder="Network Name"
                        {...nameField}
                        className="border-0 px-0 outline-hidden focus-visible:ring-0 w-full font-semibold text-lg"
                        spellCheck={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              ID: {field.network_id}
              {field.chain_id != null &&
              field.chain_id !== undefined &&
              !Number.isNaN(field.chain_id)
                ? ` · Chain: ${field.chain_id}`
                : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FormField
              control={control}
              name={`networks.${index}.is_testnet`}
              render={({ field: testnetField }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Switch
                      checked={testnetField.value}
                      onCheckedChange={testnetField.onChange}
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
                    onClick={() => onRemove(field)}
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
        <Label htmlFor={`networks.${index}.url`} className="text-sm font-medium mb-1.5 block">
          Configuration URL
        </Label>
        <div className="flex gap-2">
          <FormField
            control={control}
            name={`networks.${index}.url`}
            render={({ field: urlField }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    placeholder="Enter configuration URL"
                    {...urlField}
                    spellCheck={false}
                    className="w-full h-10"
                    id={`networks.${index}.url`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <NetworkTestButton
            url={watch(`networks.${index}.url`)}
            liteEngineHostMode={watch(`networks.${index}.lite_engine_host_mode`) || 'auto'}
            liteEngineHostCustom={watch(`networks.${index}.lite_engine_host_custom`)}
          />
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor={`networks.${index}.chain_id`} className="text-sm font-medium mb-1.5 block">
          Chain ID (Optional)
        </Label>
        <FormField
          control={control}
          name={`networks.${index}.chain_id`}
          render={({ field: chainIdField }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="number"
                  placeholder={
                    watch(`networks.${index}.is_testnet`)
                      ? String(TESTNET_CHAIN_ID)
                      : String(MAINNET_CHAIN_ID)
                  }
                  {...chainIdField}
                  value={
                    chainIdField.value != null && !Number.isNaN(chainIdField.value)
                      ? chainIdField.value
                      : ''
                  }
                  onChange={(e) => {
                    const v = e.target.value
                    chainIdField.onChange(v === '' ? undefined : parseInt(v, 10))
                  }}
                  spellCheck={false}
                  className="w-full h-10"
                  id={`networks.${index}.chain_id`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          TON mainnet: -239, testnet: -3. Leave empty to use default.
        </p>
      </div>

      <div className="mt-4">
        <Label
          htmlFor={`networks.${index}.scanner_url`}
          className="text-sm font-medium mb-1.5 block"
        >
          Scanner URL (Optional)
        </Label>
        <FormField
          control={control}
          name={`networks.${index}.scanner_url`}
          render={({ field: scannerField }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder="Enter blockchain scanner URL (optional)"
                  {...scannerField}
                  spellCheck={false}
                  className="w-full h-10"
                  id={`networks.${index}.scanner_url`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="mt-4">
        <Label
          htmlFor={`networks.${index}.toncenter3_url`}
          className="text-sm font-medium mb-1.5 block"
        >
          TonCenter V3 URL (Optional)
        </Label>
        <FormField
          control={control}
          name={`networks.${index}.toncenter3_url`}
          render={({ field: toncenter3Field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder="Enter TonCenter V3 URL (optional)"
                  {...toncenter3Field}
                  spellCheck={false}
                  className="w-full h-10"
                  id={`networks.${index}.toncenter3_url`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center space-x-2">
          <FormField
            control={control}
            name={`networks.${index}.use_tonapi_only`}
            render={({ field: tonapiOnlyField }) => (
              <FormItem className="flex items-center space-x-2 space-y-0">
                <FormControl>
                  <Switch
                    checked={!!tonapiOnlyField.value}
                    onCheckedChange={tonapiOnlyField.onChange}
                    id={`network-tonapi-only-${index}`}
                  />
                </FormControl>
                <Label
                  htmlFor={`network-tonapi-only-${index}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  Use TonAPI only (no LiteClient)
                </Label>
              </FormItem>
            )}
          />
        </div>
        {watch(`networks.${index}.use_tonapi_only`) && (
          <p className="mt-1 text-xs text-muted-foreground">
            Wallet operations use TonAPI. A TonAPI token is recommended for better rate limits.
          </p>
        )}
      </div>

      <div className="mt-4">
        <Label
          htmlFor={`networks.${index}.tonapi_url`}
          className="text-sm font-medium mb-1.5 block"
        >
          TonAPI URL (Optional)
        </Label>
        <FormField
          control={control}
          name={`networks.${index}.tonapi_url`}
          render={({ field: tonapiUrlField }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder={
                    watch(`networks.${index}.is_testnet`)
                      ? 'https://testnet.tonapi.io'
                      : 'https://tonapi.io'
                  }
                  {...tonapiUrlField}
                  spellCheck={false}
                  className="w-full h-10"
                  id={`networks.${index}.tonapi_url`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="mt-4">
        <Label
          htmlFor={`networks.${index}.lite_engine_host_mode`}
          className="text-sm font-medium mb-1.5 block"
        >
          Lite Engine Host
        </Label>
        <FormField
          control={control}
          name={`networks.${index}.lite_engine_host_mode`}
          render={({ field: hostModeField }) => (
            <FormItem>
              <Select value={hostModeField.value || 'auto'} onValueChange={hostModeField.onChange}>
                <FormControl>
                  <SelectTrigger
                    className="w-full h-10"
                    id={`networks.${index}.lite_engine_host_mode`}
                  >
                    <SelectValue placeholder="Select host mode" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {watch(`networks.${index}.lite_engine_host_mode`) === 'custom' && (
        <div className="mt-4">
          <Label
            htmlFor={`networks.${index}.lite_engine_host_custom`}
            className="text-sm font-medium mb-1.5 block"
          >
            Custom Lite Engine Host URL
          </Label>
          <FormField
            control={control}
            name={`networks.${index}.lite_engine_host_custom`}
            render={({ field: customHostField }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="Enter custom lite engine host URL (e.g., ws://localhost:8080/?ip=...&port=...&pubkey=...)"
                    {...customHostField}
                    spellCheck={false}
                    className="w-full h-10"
                    id={`networks.${index}.lite_engine_host_custom`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  )
}

export default NetworkRow
