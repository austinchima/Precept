import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      // Force a single React instance. Without this, when several React-consuming
      // libraries are present, Vite can pre-bundle react and react-dom into
      // separate optimize chunks, producing two React copies in dev — which
      // surfaces as "Invalid hook call / Cannot read properties of null
      // (reading 'useState'/'useRef')" and a blank page.
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      // Pre-bundle the React entrypoints together so they share one instance.
      include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-react';
              }
              if (id.includes('framer-motion') || id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('gsap') || id.includes('@gsap/react')) {
                return 'vendor-gsap';
              }
              if (id.includes('lenis')) {
                return 'vendor-lenis';
              }
              return 'vendor';
            }
          }
        }
      }
    },
    server: {
      port: 3000,
      host: '0.0.0.0', // bind all interfaces (Docker-friendly)
      proxy: {
        '/api': {
          target: process.env.API_TARGET || 'http://localhost:5177',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
