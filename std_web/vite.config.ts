import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget =
    process.env.VITE_BACKEND_PROXY_TARGET ||
    env.VITE_BACKEND_PROXY_TARGET ||
    env.VITE_BACKEND_BASE_URL ||
    'https://nuc-mcq-server.onrender.com';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5174,
      host: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/health': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 5174,
      host: true,
    },
  };
});
