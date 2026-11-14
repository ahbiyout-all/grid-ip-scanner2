
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // Electron 실행을 위해 상대 경로 사용
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: false,
    ws: false,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:8081',
        changeOrigin: true,
        ws: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
