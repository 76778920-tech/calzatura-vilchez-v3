import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
