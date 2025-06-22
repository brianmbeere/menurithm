import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT ?? '5173') || 5173,  // for dev
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT ?? '4173') || 4173,  // for preview
  }
})
