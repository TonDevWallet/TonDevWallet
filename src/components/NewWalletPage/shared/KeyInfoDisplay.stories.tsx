import type { Meta, StoryObj } from '@storybook/react'
import { KeyInfoDisplay } from './KeyInfoDisplay'
import { HiddenSecretValue, KeyInfoRow } from './HiddenSecretValue'

const meta = {
  title: 'New Wallet/Secret Display',
  component: KeyInfoDisplay,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-[760px] max-w-[calc(100vw-32px)] rounded-[28px] border bg-card p-6 shadow-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KeyInfoDisplay>

export default meta
type Story = StoryObj<typeof meta>

const seedHex = Buffer.alloc(32, 7).toString('hex')
const publicKey = Buffer.alloc(32, 1)

export const SeedAndPublicKey: Story = {
  args: {
    seed: seedHex,
    publicKey,
  },
}

export const FireblocksSigningMaterial: Story = {
  args: {
    seed: seedHex,
    publicKey,
    seedLabel: 'Imported seed',
    fireblocksPrivateKey: Buffer.alloc(32, 9).toString('hex'),
  },
}

export const UniformRows = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-2">
      <KeyInfoRow
        label="Seed"
        value={seedHex}
        privacy="secret"
        description="Hidden by default; copy still works while masked."
      />
      <KeyInfoRow label="Public Key" value={publicKey.toString('hex')} privacy="public" />
      <HiddenSecretValue
        label="Recovery phrase"
        value="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
        multiline
      />
    </div>
  ),
}
