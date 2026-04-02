import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }

            if (id.includes('/firebase/auth/') || id.includes('/@firebase/auth')) {
              return 'firebase-auth';
            }

            if (id.includes('/firebase/firestore/') || id.includes('/@firebase/firestore')) {
              return 'firebase-firestore';
            }

            if (id.includes('/firebase/functions/') || id.includes('/@firebase/functions')) {
              return 'firebase-functions';
            }

            if (id.includes('/firebase/storage/') || id.includes('/@firebase/storage')) {
              return 'firebase-storage';
            }

            if (id.includes('/firebase/') || id.includes('/@firebase/')) {
              return 'firebase-core';
            }

            if (id.includes('/react-markdown/') || id.includes('/remark-') || id.includes('/mdast-')) {
              return 'markdown';
            }

            if (id.includes('/recharts/')) {
              return 'charts';
            }

            if (id.includes('/jszip/') || id.includes('/file-saver/')) {
              return 'workspace-io';
            }

            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify; file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
