import type { StorybookConfig } from '@storybook/react-vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function toAliasArray(alias: unknown) {
  if (!alias) return []
  return Array.isArray(alias)
    ? alias
    : Object.entries(alias as Record<string, string>).map(([find, replacement]) => ({
        find,
        replacement,
      }))
}

const mock = (file: string) => resolve(__dirname, 'mocks', file)
const src = (file = '') => resolve(__dirname, '..', 'src', file)

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    const { default: tailwindcss } = await import('@tailwindcss/vite')
    const { nodePolyfills } = await import('vite-plugin-node-polyfills')
    config.plugins = [...(config.plugins ?? []), tailwindcss(), nodePolyfills({ globals: { Buffer: true, global: true, process: true }, protocolImports: true })]
    config.resolve = config.resolve ?? {}
    config.resolve.alias = [
      { find: /^@\/db$/, replacement: mock('db.tsx') },
      { find: /^@\/eventListener$/, replacement: mock('eventListener.ts') },
      { find: /^@\/store\/liteClient$/, replacement: mock('store/liteClient.ts') },
      { find: /^@\/store\/passwordManager$/, replacement: mock('store/passwordManager.ts') },
      { find: /^@\/store\/tonConnect$/, replacement: mock('store/tonConnect.ts') },
      { find: /^@\/store\/walletsListState$/, replacement: mock('store/walletsListState.ts') },
      { find: '@tauri-apps/api/core', replacement: mock('tauri/core.ts') },
      { find: '@tauri-apps/api/event', replacement: mock('tauri/event.ts') },
      { find: '@tauri-apps/api/path', replacement: mock('tauri/path.ts') },
      { find: '@tauri-apps/api/webviewWindow', replacement: mock('tauri/webviewWindow.ts') },
      { find: '@tauri-apps/api/window', replacement: mock('tauri/window.ts') },
      { find: '@tauri-apps/api/app', replacement: mock('tauri/app.ts') },
      { find: '@tauri-apps/plugin-cli', replacement: mock('tauri/pluginCli.ts') },
      { find: '@tauri-apps/plugin-deep-link', replacement: mock('tauri/pluginDeepLink.ts') },
      { find: '@tauri-apps/plugin-dialog', replacement: mock('tauri/pluginDialog.ts') },
      { find: '@tauri-apps/plugin-fs', replacement: mock('tauri/pluginFs.ts') },
      { find: '@tauri-apps/plugin-http', replacement: mock('tauri/pluginHttp.ts') },
      { find: '@tauri-apps/plugin-process', replacement: mock('tauri/pluginProcess.ts') },
      { find: '@tauri-apps/plugin-sql', replacement: mock('tauri/pluginSql.ts') },
      { find: '@tauri-apps/plugin-updater', replacement: mock('tauri/pluginUpdater.ts') },
      { find: '@', replacement: src() },
      { find: '~', replacement: src() },
      { find: 'util', replacement: src('util.ts') },
      { find: 'fs', replacement: src('fs.ts') },
      ...toAliasArray(config.resolve.alias),
    ]
    config.optimizeDeps = config.optimizeDeps ?? {}
    config.optimizeDeps.include = [
      ...(config.optimizeDeps.include ?? []),
      'bn.js',
      '@ton/sandbox',
      'buffer',
    ]
    config.build = config.build ?? {}
    config.build.target = 'esnext'
    config.define = {
      ...(config.define ?? {}),
      global: 'globalThis',
      'process.env': {},
      'process.browser': true,
      'process.version': JSON.stringify('v18.0.0'),
    }
    return config
  },
}

export default config
