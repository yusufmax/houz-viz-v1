import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/replicate': {
          target: 'https://api.replicate.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/replicate/, ''),
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              proxyReq.setHeader('Authorization', `Token ${env.VITE_REPLICATE_API_TOKEN || env.REPLICATE_API_TOKEN || ''}`);
            });
          }
        },
        '/api/freepik': {
          target: 'https://api.freepik.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/freepik/, ''),
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              proxyReq.setHeader('x-freepik-api-key', env.VITE_FREEPIK_API_KEY || env.FREEPIK_API_KEY || '');
            });
          }
        },
        '/api/gemini': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
          secure: false,
          ws: true,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // Inject the real API key securely in the dev proxy
              proxyReq.setHeader('x-goog-api-key', env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '');
            });
          }
        },
        '/api/openai': {
          target: 'https://api.openai.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/openai/, ''),
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              proxyReq.setHeader('Authorization', `Bearer ${env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY || ''}`);
            });
          }
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify('backend-proxy-key'),
      'process.env.GEMINI_API_KEY': JSON.stringify('backend-proxy-key')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
