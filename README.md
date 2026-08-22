# Start

**Objects for slow mornings and long evenings.**

A full-stack curated lifestyle shop — Korean craft meets Solarized-dark UI. Built as a portfolio piece to show end-to-end product thinking: server-owned state, real auth, admin ops, media pipeline, and production deployment.

**Live:** [start-app-gray.vercel.app](https://start-app-gray.vercel.app)

---

## What this is

Start is not a static product grid. It is a working e-commerce loop:

**discover → save → cart → order → notify**

- **106 SKUs** across Stationery, Home, Bags, and Wear
- **Guest browsing** with sign-in required for cart, wishlist, and checkout
- **Customer accounts** with order history and in-app notifications
- **Admin dashboard** for catalogue, orders, users, and alerts
- **IP-based locale** — prices stored in INR, displayed in the visitor's currency
- **No browser persistence** for shopper data — cart, wishlist, sessions, and orders live in Postgres

Mock checkout (no payment gateway) keeps scope focused on architecture, UX, and data integrity.

---

## How I approach the code

### Server-first state

Shopper data never touches `localStorage`. Sessions use an HttpOnly cookie (`start_session`) backed by Postgres. Cart lines, wishlist rows, and notifications are queried through typed server functions (`createServerFn` in `app/shop-api.ts`). The root loader hydrates auth on first paint so the UI is correct before client JS runs.

### Thin client, fat server

- **TanStack Router** file routes with loaders for page data
- **TanStack Query** in `ShopProvider` for mutations and cache invalidation after login/logout
- **Zod** validators on every server function input
- **Drizzle ORM** for schema, queries, and migrations via `drizzle-kit push`

### Performance where it matters

- Redis caches product lists and category stats (versioned keys, TTLs in `app/constants.ts`)
- Connection pooling for Postgres; TLS for Upstash Redis in production
- Debounced search, URL-synced filters, infinite scroll on the product grid
- Cloudinary `f_auto,q_auto,w_*` transforms on the shared `Image` component

### Security by default

- Scrypt password hashing (`app/auth.ts`)
- Login/register rate limits in Redis
- Role-gated APIs (`customer` vs `admin`)
- Session rotation on login; `Secure` cookies in production
- Strong password policy on registration

### Accessibility

Skip link, landmarks, labelled forms, `aria` on nav badges, decorative images with text labels, visible focus rings, `prefers-reduced-motion` support.

### Pragmatic UI

Solarized-dark palette (`#00141a` base, `#2aa198` accent), Gowun Batang + IBM Plex Sans KR, reusable primitives (`button`, `product-card`, `empty-state`, `page`, `nav`). Category tiles on the home page use image + gradient + piece count.

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router) |
| UI | React 19, Tailwind CSS 4 |
| Database | PostgreSQL + Drizzle ORM (`start_api_*` tables) |
| Cache / limits | Redis (Upstash) |
| Media | Cloudinary (delivery + admin uploads) |
| Stock images | [Pexels API](https://www.pexels.com/api/) — one keyword search per product, uploaded to Cloudinary on first run |
| Deploy | Vercel (Nitro `entryFormat: node`) |

---

## Architecture

```
Browser
  └── TanStack Router (file routes in src/routes/)
        └── ShopProvider (TanStack Query)
              └── createServerFn handlers (app/shop-api.ts)
                    ├── PostgreSQL (Drizzle)
                    ├── Redis (cache + rate limits)
                    └── Cloudinary (images, fonts, fallback)
```

**Key files**

| Path | Role |
|------|------|
| `app/shop-api.ts` | All server functions — auth, catalogue, cart, orders, admin |
| `app/seed.ts` | 106-product catalogue generator + `ensureSeed()` |
| `app/cloudinary.ts` | Pexels → Cloudinary migration, admin upload helpers |
| `app/auth.ts` | Sessions, cookies, password hashing, rate limits |
| `app/db-schema.ts` | Drizzle schema |
| `src/routes/__root.tsx` | SSR session, locale, asset URLs |
| `app/components/shop-provider.tsx` | Client shop state via `useShop()` |

---

## Features at a glance

| Area | Highlights |
|------|------------|
| **Storefront** | Home merchandising, filterable `/products`, detail pages with suggestions |
| **Auth** | Login, register, SSR session, account hub |
| **Cart & orders** | Server-side cart, one-click checkout, order snapshots, status workflow |
| **Wishlist** | Toggle from cards/detail; header links only when signed in |
| **Admin** | Stats panels, product edit with photo upload, order status, user/alert management |
| **Locale** | IP → country → currency formatting (INR base in DB) |

---

## Local setup

**Requirements:** Node 20+, pnpm, PostgreSQL, Redis

```bash
git clone <repo-url>
cd start-app
pnpm install
cp .env.example .env
```

Fill in `.env`:

```env
APP_ENV=local
DATABASE_URL=postgresql://user@127.0.0.1/start
REDIS_URL=redis://localhost:6379
ADMIN_EMAIL=your-admin@example.com
ADMIN_PASSWORD=your-strong-password
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
PEXELS_API_KEY=
```

```bash
pnpm db          # push schema to Postgres
pnpm dev         # http://localhost:3000
```

On first API hit, `ensureSeed()` inserts the catalogue and admin user. `ensureCloudinaryAssets()` searches Pexels by product keyword (e.g. `notebook`, `mug`, `tote`), uploads to Cloudinary, and updates product image URLs.

```bash
pnpm build       # production build
pnpm start       # preview production build
```

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `APP_ENV` | `local` or `production` — drives Redis key prefix and cookie behaviour |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis URL (`rediss://` for Upstash) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed admin account (not registerable publicly) |
| `CLOUDINARY_*` | Image delivery, admin uploads, catalogue migration |
| `PEXELS_API_KEY` | Stock product photos (free tier at pexels.com/api) |

Never commit `.env`. See `.env.example` for the full list.

---

## Routes

| Route | Access |
|-------|--------|
| `/` | Home — hero, featured, category tiles, values |
| `/products` | Search, category, sort, price filters |
| `/products/:slug` | Detail, wishlist, add to cart |
| `/login` | Login / register |
| `/orders` | Cart + order history (signed in) |
| `/wishlist` | Saved items (signed in) |
| `/account` | Customer hub |
| `/notifications` | Alerts |
| `/admin` | Admin dashboard |
| `/admin/products/:slug/edit` | Product edit + image upload |

**Nav behaviour:** guests see Shop + Login; signed-in customers also see Orders and Wishlist; admins see Shop + account menu (dashboard, logout).

---

## Data model

| Table | Purpose |
|-------|---------|
| `start_api_shop_users` | Accounts (`customer` \| `admin`) |
| `start_api_sessions` | Server sessions (7-day expiry) |
| `start_api_products` | Catalogue |
| `start_api_cart_items` | Cart lines |
| `start_api_wishlist_items` | Saved products |
| `start_api_orders` | Order headers + status |
| `start_api_order_items` | Line-item snapshots at purchase time |
| `start_api_notifications` | Per-user alerts |

---

## What I would add next

- Payment gateway (Stripe/Razorpay) with webhook order confirmation
- Email notifications alongside in-app alerts
- Inventory reservation during checkout
- Product image management UI beyond single-photo upload

---

## Further reading

`PROJECT_AI.md` in this repo is the internal BRD/FRD/technical reference — feature IDs, business rules, API inventory, and changelog. Useful if you want the full spec behind the implementation.

---

## License

ISC
