import type { Meta, StoryObj } from '@storybook/react'
import { GlobalSearch } from './GlobalSearch/GlobalSearch'
import { TopBar } from './TopBar'

function NavigationDemo() {
  return (
    <div className="space-y-6 bg-window-background p-6">
      <div className="rounded-2xl border bg-card">
        <TopBar />
      </div>
      <div className="max-w-xl">
        <GlobalSearch />
      </div>
    </div>
  )
}

const meta = {
  title: 'Components/Navigation',
  component: NavigationDemo,
  parameters: { route: '/app' },
} satisfies Meta<typeof NavigationDemo>

export default meta
type Story = StoryObj<typeof meta>

export const HeaderAndSearch: Story = {}
