import { Control, UseFormWatch } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormMessage } from '../ui/form'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGlobe, faTrash } from '@fortawesome/free-solid-svg-icons'
import { Label } from '../ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { cn } from '@/utils/cn'
import { Switch } from '../ui/switch'
import NetworkTestButton from './NetworkTestButton'

export interface NetworkSettingsProps {
  name: string
  url: string
  is_default: boolean
  network_id: number
  is_testnet: boolean
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
            <p className="text-xs text-muted-foreground">ID: {field.network_id}</p>
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
          <NetworkTestButton url={watch(`networks.${index}.url`)} />
        </div>
      </div>
    </div>
  )
}

export default NetworkRow
