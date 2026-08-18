import { sql } from 'drizzle-orm';
import { pgTable, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { TABLE_PREFIX } from '@/app/constants';
import { createInsertSchema } from "drizzle-zod";

export const dbUserSchema = pgTable(`${TABLE_PREFIX}users`, {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 32 }),
  dob: varchar('dob', { length: 32 }).notNull(),
  gender: varchar('gender', { enum: ['male', 'female', 'other'] }).notNull(),
  state_id: integer('state_id').notNull(),
  city_id: integer('city_id').notNull(),
  pincode: varchar('pincode', { length: 16 }).notNull(),
  disability: boolean('disability').notNull().default(false),
  role: varchar('role', { enum: ['player', 'creator', 'admin'] }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
});
export const entityConfig = {
  user: {
    schema: dbUserSchema,
    createValidator: createInsertSchema(dbUserSchema),
    updateValidator: createInsertSchema(dbUserSchema).partial().required({ id: true }),
    selectValidator: createInsertSchema(dbUserSchema).omit({ id: true, created_at: true }),
  },
};
