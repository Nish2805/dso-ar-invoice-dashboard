import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Separate build config for the standalone offline demo (demo.html →
// dashboard-demo.html). Entirely independent of vite.config.ts / npm run dev /
// npm run build, which remain untouched and keep serving the real app.
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: 'dist-demo',
    rollupOptions: {
      input: 'demo.html',
    },
  },
})
