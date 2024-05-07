import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'node:path'
import inject from '@rollup/plugin-inject'
// import { analyzer } from 'vite-bundle-analyzer'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    // analyzer({
    //   analyzerMode: 'static',
    // }),
  ],
  server: {
    port: 3003,
  },
  base: '/',
  optimizeDeps: {
    include: ['bn.js', '@ton/sandbox'],
    esbuildOptions: {
      target: 'esnext',
      plugins: [],
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      plugins: [inject({ Buffer: ['buffer', 'Buffer'] })],
    },
    modulePreload: false,
    commonjsOptions: {
      // include: [/@ton\/sandbox/],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '~': resolve(__dirname, './src'),
      util: resolve(__dirname, 'src/util.ts'),
      fs: resolve(__dirname, 'src/fs.ts'),
      buffer: resolve(__dirname, 'node_modules/buffer/index.js'),
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
