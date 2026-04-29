import { ReactNode, useMemo, useState } from 'react'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheck,
  faCopy,
  faEye,
  faEyeSlash,
  faKey,
  faLock,
} from '@fortawesome/free-solid-svg-icons'
import clipboard from 'clipboardy'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

export type KeyInfoPrivacy = 'public' | 'secret'

interface KeyInfoRowHeaderProps {
  label: string
  icon?: IconDefinition
  iconClassName?: string
  children?: ReactNode
}

export function KeyInfoRowHeader({
  label,
  icon = faKey,
  iconClassName,
  children,
}: KeyInfoRowHeaderProps) {
  return (
    <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
      <label className="flex items-center gap-2 text-sm font-medium">
        <FontAwesomeIcon icon={icon} className={iconClassName} />
        {label}
      </label>
      <div className="flex min-h-7 items-center gap-1.5">{children}</div>
    </div>
  )
}

interface KeyInfoRowProps {
  label: string
  value: string
  privacy?: KeyInfoPrivacy
  description?: string
  multiline?: boolean
  className?: string
  icon?: IconDefinition
  iconClassName?: string
}

export function KeyInfoRow({
  label,
  value,
  privacy = 'public',
  description,
  multiline = false,
  className,
  icon,
  iconClassName,
}: KeyInfoRowProps) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const isSecret = privacy === 'secret'
  const isVisible = !isSecret || revealed

  const maskedValue = useMemo(() => {
    if (!value) return '—'
    if (multiline) return '•••• •••• •••• •••• •••• •••• •••• ••••'
    return '••••••••••••••••••••••••••••••••'
  }, [multiline, value])

  const copyValue = () => {
    if (!value) return

    clipboard.write(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <KeyInfoRowHeader
        label={label}
        icon={icon ?? (isSecret ? faLock : faKey)}
        iconClassName={iconClassName ?? (isSecret ? 'text-muted-foreground' : 'text-primary')}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-[72px] rounded-full px-2 text-xs justify-center"
          onClick={copyValue}
          disabled={!value}
        >
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="mr-1 w-3.5" />
          {copied ? 'Copied' : 'Copy'}
        </Button>
        {isSecret && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-[68px] rounded-full px-2 text-xs justify-center"
            onClick={() => setRevealed((value) => !value)}
          >
            <FontAwesomeIcon icon={revealed ? faEyeSlash : faEye} className="mr-1 w-3.5" />
            {revealed ? 'Hide' : 'Show'}
          </Button>
        )}
      </KeyInfoRowHeader>

      <div className="rounded-2xl bg-muted/45 px-3 py-2.5">
        <code
          className={cn(
            'block min-w-0 break-all font-mono text-xs leading-relaxed',
            !isVisible && 'select-none text-muted-foreground',
            multiline && 'min-h-[72px] whitespace-pre-wrap'
          )}
        >
          {isVisible ? value || '—' : maskedValue}
        </code>
      </div>

      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

interface HiddenSecretValueProps {
  label: string
  value: string
  description?: string
  multiline?: boolean
  className?: string
}

export function HiddenSecretValue(props: HiddenSecretValueProps) {
  return <KeyInfoRow {...props} privacy="secret" />
}
