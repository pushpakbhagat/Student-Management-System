import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // libraries change less often than app code, so browsers keep them cached across deploys
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["motion", "lenis"],
        },
      },
    },
  },
  server: {
    // /api/students -> http://localhost:8004/students (same origin, so the login cookie just works)
    proxy: {
      '/api': {
        // API_PROXY_TARGET lets the browser tests point the app at their own API
        target: process.env.API_PROXY_TARGET || 'http://localhost:8004',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
