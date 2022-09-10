import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
// import mix from 'vite-plugin-mix'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // mix({
    //   handler: './src/api.ts',
    // }),
  ],
  server: {
    port: 3000,
  },
  base: '',
  optimizeDeps: {
    include: ['bn.js'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  build: {
    target: 'es2020',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '~': resolve(__dirname, './src'),
    },
  },
})
