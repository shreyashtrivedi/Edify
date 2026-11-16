import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  build: {
    rolldownOptions: {
      output: {
        // Big libraries that rarely change get their own files. Our app code changes with
        // every deploy, but browsers keep these cached, so returning visitors only download
        // the small app file again. The patterns name the libraries exactly, so nothing that
        // is only used by on-demand pages (code highlighting, PDF) gets pulled into them.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
            {
              name: 'auth0',
              test: /node_modules[\\/](@auth0|browser-tabs-lock|dpop|es-cookie)[\\/]/,
            },
          ],
        },
      },
    },
  },
});
