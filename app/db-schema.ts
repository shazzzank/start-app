import z from 'zod';
import { sql } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  integer,
  boolean,
  timestamp
} from 'drizzle-orm/pg-core';
import { TABLE_PREFIX } from '@/app/constants';

export const zodUserSchema = z.object({
  mb_user_id: z.number().int(),
  mb_org_id: z.number().int().nullable(),
  email: z.email().nullable(),
  phone: z.string().nullable(),
  dob: z.string(),
  name: z.string(),
  gender: z.enum(['male', 'female', 'other']),
  demographic_status: z.enum(['urban', 'rural']),
  state_id: z.number().int(),
  city_id: z.number().int(),
  ulb_id: z.number().int().nullable(),
  block_id: z.number().int().nullable(),
  village_id: z.number().int().nullable(),
  gram_panchayat_id: z.number().int().nullable(),
  pincode: z.string(),
  is_divyang: z.boolean().default(false),
  role: z.enum(['player', 'creator', 'admin']),
});

export const zodUserIdSchema = z.object({
  id: z.string()
});

export const dbUserSchema = pgTable(`${TABLE_PREFIX}users`, {
  id: varchar('id', { length: 64 }).primaryKey(),
  mb_user_id: integer('mb_user_id').notNull(),
  mb_org_id: integer('mb_org_id'),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 32 }),
  dob: varchar('dob', { length: 32 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  gender: varchar('gender', { length: 16 }).notNull(),
  demographic_status: varchar('demographic_status', { length: 8 }).notNull(),
  state_id: integer('state_id').notNull(),
  city_id: integer('city_id').notNull(),
  ulb_id: integer('ulb_id'),
  block_id: integer('block_id'),
  village_id: integer('village_id'),
  gram_panchayat_id: integer('gram_panchayat_id'),
  pincode: varchar('pincode', { length: 16 }).notNull(),
  is_divyang: boolean('is_divyang').notNull().default(false),
  role: varchar('role', { length: 16 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});
