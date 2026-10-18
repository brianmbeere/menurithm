import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const required = [
      'VITE_BASE_URL', 'VITE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID',
    ]
    const missing = required.filter(key => !env[key]?.trim())
    if (missing.length) {
      throw new Error(`Missing static-site build variables: ${missing.join(', ')}`)
    }
    const apiURL = new URL(env.VITE_BASE_URL)
    if (apiURL.protocol !== 'https:' || apiURL.username || apiURL.password ||
        apiURL.search || apiURL.hash) {
      throw new Error('VITE_BASE_URL must be an HTTPS API URL without credentials, query or fragment')
    }
  }

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: parseInt(process.env.PORT ?? '5173') || 5173,  // for dev
    },
    preview: {
      host: '0.0.0.0',
      port: parseInt(process.env.PORT ?? '4173') || 4173,  // for preview
      allowedHosts: ['menurithm.onrender.com']
    }
  }
})
