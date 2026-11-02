import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Where /api is proxied in development: the api container under docker compose,
// otherwise a local uvicorn started with `npm run dev:api`.
const apiTarget = process.env.API_PROXY_TARGET ?? `http://127.0.0.1:${process.env.API_PORT ?? '8000'}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Bind-mounted sources in Docker on macOS may not emit file events
    watch: process.env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
    proxy: {
      '/api': {
        target: apiTarget,
        // Keep the browser's Host header so the API's same-origin check passes
        changeOrigin: false,
      },
    },
  },
});
