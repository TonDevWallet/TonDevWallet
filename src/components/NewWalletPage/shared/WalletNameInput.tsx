import { Input } from '@/components/ui/input'

interface WalletNameInputProps {
  name: string
  onNameChange: (name: string) => void
  placeholder?: string
  autoComplete?: boolean
}

export function WalletNameInput({
  name,
  onNameChange,
  placeholder = 'My TON Wallet',
  autoComplete = false,
}: WalletNameInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor="nameRef" aria-autocomplete="none">
        Wallet Name:
      </label>
      <Input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        id="nameRef"
        className="max-w-md"
        placeholder={placeholder}
        autoComplete={autoComplete ? 'on' : 'off'}
        aria-autocomplete="none"
      />
      <p className="text-xs text-muted-foreground">
        Give your wallet a name to easily identify it later
      </p>
    </div>
  )
}
