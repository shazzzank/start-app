import { sql } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, text, timestamp, unique, varchar } from 'drizzle-orm/pg-core';
import { tablePrefix } from '@/app/constants';

const p = tablePrefix;

type OrderLine = { slug: string; name: string; price: number; qty: number };

export const users = pgTable(`${p}users`, {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { enum: ['customer', 'admin'] }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

export const sessions = pgTable(`${p}sessions`, {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (t) => [index('sessions_user_idx').on(t.userId)]);

export const products = pgTable(`${p}products`, {
  id: varchar('id', { length: 64 }).primaryKey(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 64 }).notNull(),
  summary: varchar('summary', { length: 512 }).notNull(),
  description: text('description').notNull(),
  price: integer('price').notNull(),
  stock: integer('stock').notNull(),
  image: varchar('image', { length: 512 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (t) => [
  index('products_category_idx').on(t.category),
  index('products_price_idx').on(t.price),
  index('products_name_idx').on(t.name),
]);

export const cart = pgTable(`${p}cart`, {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: varchar('product_id', { length: 64 }).notNull().references(() => products.id, { onDelete: 'cascade' }),
  qty: integer('qty').notNull().default(1),
}, (t) => [unique().on(t.userId, t.productId), index('cart_user_idx').on(t.userId)]);

export const wishlist = pgTable(`${p}wishlist`, {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: varchar('product_id', { length: 64 }).notNull().references(() => products.id, { onDelete: 'cascade' }),
}, (t) => [unique().on(t.userId, t.productId), index('wishlist_user_idx').on(t.userId)]);

export const orders = pgTable(`${p}orders`, {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  items: jsonb('items').$type<OrderLine[]>().notNull(),
  total: integer('total').notNull(),
  status: varchar('status', { enum: ['pending', 'shipped', 'delivered'] }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (t) => [index('orders_user_idx').on(t.userId)]);

export const notifications = pgTable(`${p}notifications`, {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (t) => [index('notifications_user_idx').on(t.userId)]);
