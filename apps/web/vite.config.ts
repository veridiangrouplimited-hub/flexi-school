import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // @react-pdf/renderer uses canvas which Vite can't pre-bundle
    exclude: ['@react-pdf/renderer'],
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: 'http://localhost:4000', changeOrigin: true },
      '/api':  { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
