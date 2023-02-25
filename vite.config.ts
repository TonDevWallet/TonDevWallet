import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'node:path'
import inject from '@rollup/plugin-inject'
// import mix from 'vite-plugin-mix'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    port: 3003,
  },
  base: '/',
  optimizeDeps: {
    include: ['bn.js'],
    esbuildOptions: {
      target: 'esnext',
      plugins: [],
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'ton-core': ['ton-core'],
          sandbox: ['@ton-community/sandbox'],
        },
      },
      plugins: [inject({ Buffer: ['buffer', 'Buffer'] })],
    },
    modulePreload: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '~': resolve(__dirname, './src'),
      util: 'src/util.ts',
      fs: 'src/fs.ts',
      buffer: 'buffer/index.js', // add buffer
    },
  },
  define: {
    ...(command === 'build'
      ? {}
      : {
          process: {},
        }),
  },
}))
