import { defineConfig } from 'drizzle-kit';
import { DATABASE_URL } from '@/app/constants';

export default defineConfig({
  schema: './app/db-schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: DATABASE_URL },
  tablesFilter: ['start_api_*'],
});
