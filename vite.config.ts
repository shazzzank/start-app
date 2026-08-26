import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const appEnv = process.env.APP_ENV
    || fileEnv.APP_ENV
    || (mode === 'production' || process.env.NODE_ENV === 'production' ? 'production' : 'local');
  return {
    server: {
      port: Number(process.env.PORT || fileEnv.PORT || 3000),
    },
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
