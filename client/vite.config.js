import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Prefer IPv4 to avoid Windows ::1 ECONNREFUSED issues
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});

