import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
// import { analyzer } from 'vite-bundle-analyzer'

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
    // analyzer({
    //   analyzerMode: 'static',
    // }),
  ],
  build: {
    lib: {
      entry: './lib/index.ts',
      name: 'Traces',
      fileName: 'traces',
    },
    rollupOptions: {
      external: ['@ton/core', '@ton/crypto'],
    },
  },
})
