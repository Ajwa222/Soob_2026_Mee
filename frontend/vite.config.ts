import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { compression } from 'vite-plugin-compression2'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    compression({ algorithms: ['gzip', 'brotliCompress'] }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-slot', '@radix-ui/react-slider', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-separator', '@radix-ui/react-checkbox', '@radix-ui/react-radio-group', '@radix-ui/react-label', '@radix-ui/react-progress'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'analytics': ['mixpanel-browser', '@microsoft/clarity'],
        },
      },
    },
  },
})
