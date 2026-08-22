import { sql } from 'drizzle-orm';
import { pgTable, varchar, integer, text, boolean, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { TABLE_PREFIX } from '@/app/constants';

const p = TABLE_PREFIX;

export const shopUsers = pgTable(`${p}shop_users`, {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { enum: ['customer', 'admin'] }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

export const sessions = pgTable(`${p}sessions`, {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 }).notNull().references(() => shopUsers.id, { onDelete: 'cascade' }),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (t) => [
  index('sessions_user_id_idx').on(t.user_id),
  index('sessions_expires_at_idx').on(t.expires_at),
]);

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
  created_at: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (t) => [
  index('products_category_idx').on(t.category),
  index('products_price_idx').on(t.price),
  index('products_name_idx').on(t.name),
]);

export const cartItems = pgTable(`${p}cart_items`, {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 }).notNull().references(() => shopUsers.id, { onDelete: 'cascade' }),
  product_id: varchar('product_id', { length: 64 }).notNull().references(() => products.id, { onDelete: 'cascade' }),
  qty: integer('qty').notNull().default(1),
}, (t) => [unique().on(t.user_id, t.product_id), index('cart_items_user_id_idx').on(t.user_id)]);

export const wishlistItems = pgTable(`${p}wishlist_items`, {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 }).notNull().references(() => shopUsers.id, { onDelete: 'cascade' }),
  product_id: varchar('product_id', { length: 64 }).notNull().references(() => products.id, { onDelete: 'cascade' }),
}, (t) => [unique().on(t.user_id, t.product_id), index('wishlist_items_user_id_idx').on(t.user_id)]);

export const orders = pgTable(`${p}orders`, {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 }).notNull().references(() => shopUsers.id),
  total: integer('total').notNull(),
  status: varchar('status', { enum: ['pending', 'shipped', 'delivered'] }).notNull().default('pending'),
  created_at: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (t) => [
  index('orders_user_id_idx').on(t.user_id),
  index('orders_created_at_idx').on(t.created_at),
]);

export const orderItems = pgTable(`${p}order_items`, {
  id: varchar('id', { length: 64 }).primaryKey(),
  order_id: varchar('order_id', { length: 64 }).notNull().references(() => orders.id, { onDelete: 'cascade' }),
  product_id: varchar('product_id', { length: 64 }).notNull().references(() => products.id),
  name: varchar('name', { length: 255 }).notNull(),
  price: integer('price').notNull(),
  qty: integer('qty').notNull(),
}, (t) => [index('order_items_order_id_idx').on(t.order_id)]);

export const notifications = pgTable(`${p}notifications`, {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 }).notNull().references(() => shopUsers.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  read: boolean('read').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (t) => [
  index('notifications_user_id_idx').on(t.user_id),
  index('notifications_read_idx').on(t.read),
]);

