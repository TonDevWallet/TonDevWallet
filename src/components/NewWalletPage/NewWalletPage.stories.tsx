import type { Meta, StoryObj } from '@storybook/react'
import { NewWalletPage, type NewWalletTab } from './NewWalletPage'

const tabOptions: NewWalletTab[] = ['random', 'mnemonic', 'seed', 'public-key']
const argsFor = (defaultTab: NewWalletTab) => ({ defaultTab })

const meta = {
  title: 'Pages/New Wallet',
  component: NewWalletPage,
  parameters: { route: '/app/new_wallet' },
  decorators: [
    (Story) => (
      <div className="bg-window-background p-6">
        <Story />
      </div>
    ),
  ],
  argTypes: { defaultTab: { control: 'radio', options: tabOptions } },
} satisfies Meta<typeof NewWalletPage>

export default meta
type Story = StoryObj<typeof meta>

export const CreateRandomWallet: Story = {
  args: argsFor('random'),
}

export const FromMnemonic: Story = {
  args: argsFor('mnemonic'),
}

export const FromSeed: Story = {
  args: argsFor('seed'),
}

export const WatchOnly: Story = {
  args: argsFor('public-key'),
}

export const InteractiveTabs: Story = {
  args: argsFor('random'),
}
