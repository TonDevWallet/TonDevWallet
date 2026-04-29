import { faKey } from '@fortawesome/free-solid-svg-icons'
import { KeyInfoRow } from './HiddenSecretValue'

interface KeyInfoDisplayProps {
  seed: string
  publicKey?: Buffer | Uint8Array
  seedLabel?: string
  fireblocksPrivateKey?: string
}

export function KeyInfoDisplay({
  seed,
  publicKey,
  fireblocksPrivateKey,
  seedLabel = 'Seed',
}: KeyInfoDisplayProps) {
  const publicKeyHex = publicKey ? Buffer.from(publicKey).toString('hex') : ''

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <KeyInfoRow
        label={seedLabel}
        value={seed}
        privacy="secret"
        description="Hidden by default. Reveal only when you need to verify it."
      />

      {publicKeyHex && (
        <KeyInfoRow
          label="Public Key"
          value={publicKeyHex}
          privacy="public"
          icon={faKey}
          iconClassName="text-primary"
        />
      )}

      {fireblocksPrivateKey && (
        <KeyInfoRow
          label="Fireblocks Private Key"
          value={fireblocksPrivateKey}
          privacy="secret"
          description="This is private signing material. Keep it hidden unless required."
        />
      )}
    </div>
  )
}
