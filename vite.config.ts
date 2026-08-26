import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';

function required(fileEnv: Record<string, string>, name: string) {
  const value = (process.env[name] || fileEnv[name] || '').trim();
  if (value) return value;
  throw new Error(`Missing required env: ${name}`);
}

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const appEnv = required(fileEnv, 'APP_ENV');
  const port = Number(required(fileEnv, 'PORT'));
  if (!Number.isFinite(port)) throw new Error('PORT must be a number');
  return {
    server: { port },
    resolve: {
      alias: { '@': path.resolve(__dirname, './') },
      tsconfigPaths: true,
    },
    define: {
      'import.meta.env.VITE_APP_ENV': JSON.stringify(appEnv),
    },
    oxc: {
      jsx: {
        runtime: 'automatic',
        development: mode !== 'production',
      },
    },
    esbuild: {
      jsx: 'automatic',
      jsxDev: mode !== 'production',
    },
    plugins: [
      tailwindcss(),
      tanstackStart(),
      nitro({ vercel: { entryFormat: 'node' } }),
      viteReact({ jsxRuntime: 'automatic' }),
    ],
  };
});
