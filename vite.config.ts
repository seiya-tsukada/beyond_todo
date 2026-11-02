import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development the Python API runs separately (npm run dev:api).
    // The Host header is preserved so the API's same-origin check passes.
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.API_PORT ?? '8000'}`,
        changeOrigin: false,
      },
    },
  },
});
