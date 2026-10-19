import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Same-origin proxies: the browser talks to /api and /auth without CORS or exposed ports.
  const proxy = {
    '/api': {
      target: env.API_PROXY_TARGET || 'http://127.0.0.1:3000',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api/, ''),
    },
    '/auth': {
      target: env.AUTH_PROXY_TARGET || 'http://127.0.0.1:9999',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/auth/, ''),
    },
  }
  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
  }
})
