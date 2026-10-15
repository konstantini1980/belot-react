import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: 'https://konstantini1980.github.io/belot-react/',
  plugins: [react()],
  build: {
    // Serve card images as separate cacheable files instead of base64 inside the JS bundle
    assetsInlineLimit: 0,
  },
  server: {
    sourcemapIgnoreList: false, // Dev server only: don't hide any files in source maps
  },
  test: {
    globals: true,
    environment: 'node',
  },
})

