import path from 'path';
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { PORT } from './app/constants';

export default defineConfig(({ mode }) => ({
  server: {
    port: PORT,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
    tsconfigPaths: true,
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
}));
