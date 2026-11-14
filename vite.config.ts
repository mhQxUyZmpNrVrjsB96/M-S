import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const isHmrDisabled = process.env.DISABLE_HMR === 'true';
  const isHttpsProxy = process.env.APP_URL?.startsWith('https');

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Con DISABLE_HMR=true in Vite 6 middlewareMode, @vite/client viene comunque iniettato
      // e tenta di aprire un WebSocket sulla porta 24678. Evitiamo la connessione WS a monte.
      ...(isHmrDisabled
        ? [
            {
              name: 'disable-hmr-client-ws',
              apply: 'serve' as const,
              enforce: 'post' as const,
              transform(code: string, id: string) {
                const normalizedId = id.replace(/\\/g, '/');
                if (normalizedId.endsWith('vite/dist/client/client.mjs')) {
                  return code.replace(
                    'transport.connect(createHMRHandler(handleMessage));',
                    '/* HMR disabilitato (DISABLE_HMR=true): connessione WebSocket saltata */',
                  );
                }
              },
            },
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      allowedHosts: true as const,
      ...(isHmrDisabled ? { ws: false as const } : {}),
      // Supporto HMR sia locale che dietro reverse proxy HTTPS di Google AI Studio
      hmr: isHmrDisabled
        ? false
        : {
            clientPort: isHttpsProxy ? 443 : undefined,
            protocol: isHttpsProxy ? 'wss' : undefined,
          },
      watch: isHmrDisabled ? null : {},
    },
  };
});
