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
  const firebaseApiKey = envValue(env, 'VITE_FIREBASE_API_KEY', 'FIREBASE_API_KEY');
  const firebaseAuthDomain = envValue(env, 'VITE_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN');
  const firebaseProjectId = envValue(env, 'VITE_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID');
  const firebaseStorageBucket = envValue(env, 'VITE_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET');
  const firebaseMessagingSenderId = envValue(env, 'VITE_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID');
  const firebaseAppId = envValue(env, 'VITE_FIREBASE_APP_ID', 'FIREBASE_APP_ID');
  const firebaseMeasurementId = envValue(env, 'VITE_FIREBASE_MEASUREMENT_ID', 'FIREBASE_MEASUREMENT_ID');
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
    'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(firebaseApiKey),
    'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(firebaseAuthDomain),
    'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(firebaseProjectId),
    'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(firebaseStorageBucket),
    'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(firebaseMessagingSenderId),
    'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(firebaseAppId),
    'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(firebaseMeasurementId),
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
