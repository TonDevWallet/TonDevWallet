import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/utils/cn'

interface ImportButtonProps extends Omit<ButtonProps, 'children'> {
  isLoading: boolean
  selectedWalletsCount: number
  defaultText?: string
  loadingText?: string
  name?: string
}

export function ImportButton({
  isLoading,
  selectedWalletsCount,
  defaultText = 'Import Wallet',
  loadingText = 'Saving...',
  name,
  disabled,
  className,
  ...props
}: ImportButtonProps) {
  const buttonText = isLoading
    ? loadingText
    : selectedWalletsCount > 0
      ? `Import ${selectedWalletsCount} Selected Wallet${selectedWalletsCount > 1 ? 's' : ''}`
      : defaultText

  return (
    <Button
      disabled={disabled || isLoading || (!name && !disabled)}
      size="lg"
      className={cn('', !name && 'opacity-50', className)}
      {...props}
    >
      {buttonText}
    </Button>
  )
}
