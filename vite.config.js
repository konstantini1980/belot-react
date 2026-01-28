import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: 'https://konstantini1980.github.io/belot-react/',
  plugins: [react()],
  build: {
    sourcemap: true, // Enable source maps for production builds
  },
  server: {
    sourcemapIgnoreList: false, // Don't ignore any files in source maps
  },
  test: {
    globals: true,
    environment: 'node',
  },
})

