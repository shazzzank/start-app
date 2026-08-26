import { defineConfig } from 'drizzle-kit';
import { databaseUrl } from './app/constants';

export default defineConfig({
  schema: './app/server/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  tablesFilter: ['start_api_*'],
});
