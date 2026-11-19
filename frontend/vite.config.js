// Archivo: frontend/vite.config.js
// En desarrollo, Vite reenvía /api al backend: mismo origen, la cookie de sesión funciona sin CORS.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
