import Copier from '@/components/copier'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey } from '@fortawesome/free-solid-svg-icons'

interface KeyInfoDisplayProps {
  seed: string
  publicKey: Buffer | Uint8Array
  seedLabel?: string
}

export function KeyInfoDisplay({ seed, publicKey, seedLabel = 'Seed' }: KeyInfoDisplayProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <FontAwesomeIcon icon={faKey} className="text-primary" />
          {seedLabel}:
        </label>
        <div className="flex items-center p-2 bg-muted rounded-md">
          <code className="text-xs overflow-hidden text-ellipsis font-mono break-all">{seed}</code>
          <Copier className="w-5 h-5 ml-2 shrink-0" text={seed} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <FontAwesomeIcon icon={faKey} className="text-primary" />
          Public Key:
        </label>
        <div className="flex items-center p-2 bg-muted rounded-md">
          <code className="text-xs overflow-hidden text-ellipsis font-mono break-all">
            {Buffer.from(publicKey).toString('hex')}
          </code>
          <Copier className="w-5 h-5 ml-2 shrink-0" text={Buffer.from(publicKey).toString('hex')} />
        </div>
      </div>
    </div>
  )
}
