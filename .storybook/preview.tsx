import type { Preview } from '@storybook/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { DbContext, mockDb } from '@/db'
import '../src/index.css'
import './preview.css'
import { Buffer } from 'buffer'

type AppTheme = 'light' | 'dark'

const applyAppTheme = (theme: AppTheme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem('theme', JSON.stringify(theme))
  } catch {
    // Storybook can run with storage disabled.
  }
}

const globals = globalThis as typeof globalThis & {
  Buffer?: typeof Buffer
  global?: typeof globalThis
}
globals.Buffer ??= Buffer
globals.global ??= globalThis

const preview: Preview = {
  tags: ['autodocs'],
  globalTypes: {
    appTheme: {
      name: 'Theme',
      description: 'App theme',
      defaultValue: 'light',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'app',
      values: [{ name: 'app', value: 'hsl(var(--background))' }],
    },
    layout: 'fullscreen',
  },
  decorators: [
    (Story, context) => {
      const appTheme: AppTheme = context.globals.appTheme === 'dark' ? 'dark' : 'light'
      React.useEffect(() => applyAppTheme(appTheme), [appTheme])
      return (
        <DbContext.Provider value={mockDb as any}>
          <MemoryRouter initialEntries={[context.parameters.route ?? '/app']}>
            <React.Suspense fallback={<div className="p-6 text-muted-foreground">Loading story…</div>}>
              <div className="bg-background text-foreground">
                <Story />
                <Toaster />
              </div>
            </React.Suspense>
          </MemoryRouter>
        </DbContext.Provider>
      )
    },
  ],
}

export default preview
