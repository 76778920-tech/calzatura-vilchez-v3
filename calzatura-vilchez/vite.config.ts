import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Rechaza builds de producción donde el bearer token quedaría expuesto en el bundle.
 * Si VITE_AI_SERVICE_BEARER_TOKEN está definido sin VITE_AI_ADMIN_PROXY_URL,
 * el token viaja en claro en el JS descargado por el navegador.
 */
const aiSecurityCheck: Plugin = {
  name: 'ai-security-check',
  configResolved(config) {
    if (config.command !== 'build') return
    const proxyUrl   = process.env.VITE_AI_ADMIN_PROXY_URL?.trim()
    const bearerToken = process.env.VITE_AI_SERVICE_BEARER_TOKEN?.trim()
    if (bearerToken && !proxyUrl) {
      throw new Error(
        '\n[SEGURIDAD] VITE_AI_SERVICE_BEARER_TOKEN está definido sin VITE_AI_ADMIN_PROXY_URL.\n' +
        'El token quedaría expuesto en el bundle de producción.\n' +
        'Define VITE_AI_ADMIN_PROXY_URL para activar el proxy seguro (Cloud Function),\n' +
        'o elimina VITE_AI_SERVICE_BEARER_TOKEN del entorno de build.',
      )
    }
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss(), aiSecurityCheck],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/domains/**/utils/**', 'src/domains/**/services/finance.ts'],
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('@react-three/drei')) {
            return 'three-drei'
          }

          if (id.includes('@react-three/fiber')) {
            return 'three-fiber'
          }

          if (id.includes('/three/')) {
            return 'three-core'
          }

          if (id.includes('/xlsx/')) {
            return 'xlsx'
          }

          if (id.includes('/firebase/')) {
            return 'firebase'
          }

          if (id.includes('@supabase/')) {
            return 'supabase'
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/')
          ) {
            return 'react-core'
          }

          if (
            id.includes('/framer-motion/') ||
            id.includes('/lucide-react/') ||
            id.includes('/react-hot-toast/') ||
            id.includes('@radix-ui/')
          ) {
            return 'ui-stack'
          }

          if (id.includes('/@stripe/')) {
            return 'payments'
          }

          return 'vendor'
        },
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
      },
    },
  },
})
