import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Rechaza cualquier build donde VITE_AI_SERVICE_BEARER_TOKEN esté presente.
 * Vite incrusta LITERALMENTE todos los VITE_* en el bundle en tiempo de build,
 * independientemente de si el runtime usa el proxy — el token queda visible en
 * el JS descargado por el navegador aunque el proxy esté activo.
 * El token del servicio IA solo debe vivir en Firebase Secret (server-side).
 */
const aiSecurityCheck: Plugin = {
  name: 'ai-security-check',
  configResolved(config) {
    if (config.command !== 'build') return
    const bearerToken = process.env.VITE_AI_SERVICE_BEARER_TOKEN?.trim()
    if (bearerToken) {
      throw new Error(
        '\n[SEGURIDAD] VITE_AI_SERVICE_BEARER_TOKEN no debe existir en builds frontend.\n' +
        'Vite lo incrusta en el bundle aunque el proxy esté activo, exponiéndolo al navegador.\n' +
        'El token solo debe estar en Firebase Secret (AI_SERVICE_BEARER_TOKEN) — server-side.\n' +
        'Elimina VITE_AI_SERVICE_BEARER_TOKEN del entorno de build y de .env.local.',
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
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/domains/')) {
            if (
              id.includes('/administradores/') ||
              id.includes('/fabricantes/') ||
              id.includes('/Admin') ||
              id.includes('/ventas/')
            ) {
              return 'app-admin'
            }
            if (id.includes('/carrito/') || id.includes('/pedidos/') || id.includes('/Checkout')) {
              return 'app-checkout'
            }
            return 'app-public'
          }

          if (!id.includes('node_modules')) return undefined

          if (
            id.includes('@react-three/') ||
            id.includes('/three/')
          ) {
            return 'three'
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

          return 'vendor'
        },
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
      },
    },
  },
})
