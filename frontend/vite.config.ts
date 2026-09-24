import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
    // Allow tunneled hostnames (e.g. localtunnel/ngrok) through Vite's dev-server
    // host check — safe here since this is a temporary local demo, not a deployment.
    allowedHosts: true,
  },
})
