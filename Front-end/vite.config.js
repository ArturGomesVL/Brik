import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Libera os links temporários do Cloudflare Tunnel (para mostrar o app fora de casa).
  server: { allowedHosts: ['.trycloudflare.com'] },
})
