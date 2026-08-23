import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';

function envValue(env: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key] ?? env[key];
    if (value) return value;
  }
  return '';
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const cloudinaryCloudName = envValue(env, 'CLOUDINARY_CLOUD_NAME', 'VITE_CLOUDINARY_CLOUD_NAME');
  return {
  server: {
    port: Number(process.env.PORT ?? env.PORT ?? 3000),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
    tsconfigPaths: true,
  },
  define: {
    'import.meta.env.VITE_CLOUDINARY_CLOUD_NAME': JSON.stringify(cloudinaryCloudName),
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
