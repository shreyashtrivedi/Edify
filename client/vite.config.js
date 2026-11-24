import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

/** Settings the deployed app can't work without (each is baked into the build). */
const REQUIRED_ON_VERCEL = [
  'VITE_API_URL',
  'VITE_AUTH0_DOMAIN',
  'VITE_AUTH0_CLIENT_ID',
  'VITE_AUTH0_AUDIENCE',
];

/**
 * Vercel builds only. Link previews need the site's public address (VITE_SITE_URL in
 * index.html): if it isn't set, use the production address Vercel provides. And a missing
 * setting stops the build with a clear message, instead of shipping an app that quietly
 * calls localhost or can't log anyone in.
 */
function checkVercelSettings(mode) {
  if (!process.env.VERCEL) return;

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!process.env.VITE_SITE_URL && productionHost) {
    // Vite reads VITE_* values from process.env after this config runs
    process.env.VITE_SITE_URL = `https://${productionHost}`;
  }

  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const missing = REQUIRED_ON_VERCEL.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(', ')}. Add them in Vercel → Project → ` +
        'Settings → Environment Variables, then redeploy.',
    );
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  checkVercelSettings(mode);

  return {
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
  };
});
