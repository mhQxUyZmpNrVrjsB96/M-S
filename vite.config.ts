import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const isHttpsProxy = process.env.APP_URL?.startsWith('https');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      // Supporto HMR sia locale che dietro reverse proxy HTTPS di Google AI Studio
      hmr: process.env.DISABLE_HMR === 'true'
        ? false
        : {
            clientPort: isHttpsProxy ? 443 : undefined,
          },
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
