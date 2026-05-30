import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'esnext',
    minify: 'oxc',
    cssMinify: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react']
  }
})

