# Start — BRD / FRD / Technical Reference

**Single source of truth for product, business, and engineering context.**  
Update this file whenever behaviour, data, or scope changes in code.

| Doc | Sections |
|-----|----------|
| **BRD** | §1 Vision · §2 Users · §3 Business rules |
| **FRD** | §4 Features · §5 User flows · §6 Catalogue |
| **Technical** | §7 Stack · §8 Data model · §9 API · §10 Routes · §11 UI |
| **Ops** | §12 Commands · §13 Out of scope · §14 Changelog |

---

## 1. Vision (BRD)

**Start** is a curated lifestyle e-commerce experience themed around Korean craft and Solarized-dark aesthetics. Tagline: *Objects for slow mornings and long evenings.*

**Goals**

- Browse and buy thoughtful goods across four moods: Stationery, Home, Bags, Wear.
- Persist all shopper state server-side (Postgres) — no cart/session data in the browser.
- Support two roles: **customer** and **admin** (store operator).
- Demonstrate a full shop loop: discover → save → cart → order → notifications.

**Non-goals (current phase)**

- Payment gateway integration (checkout is instant / mock).
- Redis for caching and rate limits; images on Cloudinary (no S3/Minio).
- Multi-vendor checkout splits or shipping carriers.

---

## 2. Users & roles (BRD)

| Role | Needs |
|------|--------|
| **Guest** | Browse catalogue, view product detail, filter/search. Must sign in to cart, wishlist, or checkout. |
| **Customer** | Register/login, cart, wishlist, place orders, view order history, receive notifications. |
| **Admin** | Dashboard hub (stats switch panels), all orders, catalogue edit/delete, user list, alerts; no cart/wishlist/account page |

**Seed accounts** (local dev — credentials live only in this file)

| Role | Email | Password |
|------|-------|----------|
| Admin | email@example.com | Asd@1123 |

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your local `.env` (gitignored) to match before first run. Registration always creates **customer** accounts; admin email cannot be registered publicly.

---

## 3. Business rules (BRD)

1. **Sessions** — HttpOnly cookie `start_session` maps to a row in `start_api_sessions`. Expires after 7 days.
2. **Cart** — One row per user × product; quantity increments on repeat add. Cleared after successful order.
3. **Orders** — Snapshot line items (name, price, qty) at purchase time. Status: `pending` → `shipped` → `delivered`.
4. **Notifications** — Created on: registration welcome, order placed (customer + admins), order status change (customer).
5. **Catalogue** — Admin manages all products from the dashboard.
6. **Pricing** — Stored in INR (base currency). Display converts by visitor locale (IP-derived). Checkout and DB amounts stay in INR.
7. **Locale** — Country from request IP (no browser permission). CDN country headers → ip-api.com → `Accept-Language` → default `IN`.
8. **Stock** — Shown on product detail; admin can update via edit form.
9. **No browser persistence** — Cart, wishlist, auth, orders, and notifications live in Postgres only.

---

## 4. Functional requirements (FRD)

### 4.1 Storefront

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F-01 | Home page merchandising | Hero, featured products, values, **image category tiles**, under-₹1,500, new arrivals, studio blurb |
| F-02 | Product listing | Search (debounced), category/sort on change, price on blur, URL-synced filters |
| F-03 | Product detail | Image, copy, stock, add to cart, wishlist toggle, same-category suggestions |
| F-04 | Category browse | Home tiles and `/products?category=` filter |

### 4.2 Account & auth

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F-10 | Login / register | Email + password; invalid credentials show error; success redirects home |
| F-11 | Session SSR | Signed-in user visible on first paint (root loader + cookie) |
| F-12 | Account hub | Stats + links to orders, wishlist, notifications, role tools |
| F-13 | Logout | Clears session row + cookie; client state reset |

### 4.3 Cart & orders

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F-20 | Cart | Add/remove lines; badge on Orders nav |
| F-21 | Checkout | Place order from cart; total computed server-side; cart cleared |
| F-22 | Order history | Customer sees own orders; admin sees all with customer name |
| F-23 | Admin status | Admin changes status; customer notified |

### 4.4 Wishlist & alerts

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F-30 | Wishlist | Toggle from detail; list page with add-to-cart |
| F-31 | Notifications | List with read/unread; mark read action |

### 4.5 Admin

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F-40 | Product edit | Form: name, summary, description, price, stock, image URL (admin only) |
| F-42 | Admin dashboard | Stats as panel switchers; products/orders/users/alerts with view/edit/delete actions |

---

## 5. User flows (FRD)

```
Guest → /products → /products/:slug → /login → add to cart → /orders → place order → /notifications

Admin → /login → /admin → stat panels (catalogue, orders, users, alerts) → view / edit / delete

**Admin nav:** Shop only in header; account menu has Dashboard + Log out (no Account, Orders, Wishlist, or Alerts links).
```

---

## 6. Product catalogue (FRD)

**Total SKUs:** 106 (6 flagship + 100 generated)

| Category | Count | Examples |
|----------|------:|----------|
| Stationery | 26 | Hanji Field Notebook, Seoul Ink Pen Set, Kyoto Desk Journal |
| Home | 28 | Osaka Night Mug, Ceramic Incense Stand, Brass Entry Tray |
| Bags | 26 | Seoul Market Tote, Osaka Weekender Bag, Canvas Backpack |
| Wear | 26 | Linen Studio Apron, Seoul Linen Scarf, Cotton Tee |

**Seed behaviour** (`app/seed.ts`)

- `ensureSeed()` runs on first server-fn call per process.
- Creates admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars (see §2); removes legacy `admin@start.local` account.
- **Upserts by slug:** inserts any catalogue row not already in DB (safe for existing databases).
- Export: `catalog` array (106 items), `mapProduct()` for API responses.

**Imagery** — Picsum URLs per slug. Fallback: `public/fallback.svg` via shared `Image` component (`onError` handler, `decorative` prop for redundant alts).

---

## 7. Stack (Technical)

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start, TanStack Router (file routes) |
| UI | React 19, Tailwind CSS 4, `app/styles.css` |
| Data | Drizzle ORM + PostgreSQL, table prefix `start_api_` |
| Client data | TanStack Query via `ShopProvider` |
| Auth cookie | `start_session` → `start_api_sessions` |
| Infra | Postgres, Redis (`app/config.ts`), Cloudinary |
| Media | Cloudinary (`app/cloudinary.ts`) — images, fonts, fallback; admin upload/remove |

---

## 8. Data model (Technical)

| Table | Purpose |
|-------|---------|
| `start_api_shop_users` | Accounts (`customer` \| `admin`) |
| `start_api_sessions` | Server sessions |
| `start_api_products` | Catalogue |
| `start_api_cart_items` | Cart lines |
| `start_api_wishlist_items` | Saved products |
| `start_api_orders` | Order header + status |
| `start_api_order_items` | Line-item snapshot |
| `start_api_notifications` | Per-user alerts |

Schema file: `app/db-schema.ts`

---

## 9. Server API (Technical)

All handlers in `app/shop-api.ts` via `createServerFn`:

| Domain | Functions |
|--------|-----------|
| Auth | `getSessionFn`, `loginFn`, `registerFn`, `logoutFn` |
| Locale | `getLocaleFn` — IP-based country + currency (no consent) |
| Catalogue | `getProductsFn`, `getProductFn`, `getSuggestedFn`, `getCategoriesFn` |
| Cart / checkout | `getCartFn`, `addToCartFn`, `removeFromCartFn`, `placeOrderFn` |
| Wishlist | `getWishlistFn`, `toggleWishlistFn` |
| Orders | `getOrdersFn`, `updateOrderStatusFn` |
| Notifications | `getNotificationsFn`, `markNotificationReadFn` |
| Admin | `getAdminStatsFn`, `getAdminUsersFn`, `getAdminProductsFn`, `updateProductFn`, `deleteProductFn`, `deleteOrderFn`, `deleteUserFn`, `deleteNotificationFn` |

Auth helpers: `app/auth.ts` · Session SSR: root loader in `src/routes/__root.tsx`

---

## 10. Routes (Technical)

| Route | Purpose |
|-------|---------|
| `/` | Home (hero, featured, values, category tiles, under ₹1,500, arrivals, studio) |
| `/products` | Filterable product grid |
| `/products/$slug` | Detail + suggestions |
| `/login` | Login / register |
| `/account` | Customer account hub (admins redirect to `/admin`) |
| `/orders` | Cart + order history |
| `/wishlist` | Saved items |
| `/notifications` | Alerts |
| `/admin` | Admin dashboard — stat buttons switch products / orders / users / alerts panels |
| `/admin/products/$slug/edit` | Product edit form (admin only) |
| `/create/$entity`, `/get/$entity/$id` | Legacy CRUD scaffold |

Layout: `app/components/page.tsx` + `app/components/nav.tsx`  
Client shop state: `app/components/shop-provider.tsx` → `useShop()`

---

## 11. UI & design (Technical)

- **Theme:** Solarized-dark (`#00141a` base), accent `#2aa198`
- **Fonts:** Gowun Batang (headings), IBM Plex Sans KR (body)
- **Section tags:** Korean + English (e.g. `상품 · Shop`, `관리 · Admin`)
- **Components:** `button`, `image`, `product-card`, `empty-state`, `page`, `nav` (logo · centered breadcrumb · menu links)
- **A11y:** Skip link, `#main-content` landmark on every page, visible focus rings, labelled forms/filters, tab roles on login, `aria-label` on nav badges, decorative category images with text labels, `prefers-reduced-motion` support
- **Security:** Scrypt password hashing, HttpOnly session cookies (`Secure` in production), login/register rate limits (Redis), role-gated APIs, strong password policy on register, session rotation on login, no credential hints in UI
- **Performance:** Redis product/category cache, connection pooling, DB indexes, batched order queries, single-run seed
- **Category tiles:** `.cat-grid` / `.cat-tile` — image, gradient overlay, piece count

---

## 12. Commands (Ops)

```bash
pnpm dev      # http://localhost:3000 — triggers seed on first API hit
pnpm db       # drizzle-kit push (apply indexes after schema changes)
pnpm build
```

Copy `.env.example` → `.env`, then set `ADMIN_EMAIL` / `ADMIN_PASSWORD` from §2 and Cloudinary keys (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`). Never commit `.env`. First API hit uploads local `public/products` and `public/fonts` to Cloudinary, then DB image URLs are updated.

Database URL: `app/constants.ts` → `postgresql://moses@127.0.0.1/start`

**Refresh catalogue after seed changes:** restart dev server; `ensureSeed()` inserts missing slugs automatically.

---

## 13. Out of scope / legacy

- Removed: `app/schema/user.ts` (replaced by `shop_users`)
- No payment processor
- S3/Minio removed; Redis used for product cache and rate limits

---

## 14. Changelog

| Date | Change |
|------|--------|
| 2026-08-22 | Initial shop: auth, cart, orders, notifications, partner/admin, Postgres-only state |
| 2026-08-22 | SSR session fix; admin inline catalogue; home sections; `PROJECT_AI.md` created |
| 2026-08-22 | Home category section → image tiles (`.cat-grid`) |
| 2026-08-22 | **Catalogue expanded to 106 SKUs**; seed upserts by slug; doc restructured as BRD/FRD |
| 2026-08-22 | **Product images fixed** — Picsum URLs per slug, DB image sync on seed, `Image` + `/fallback.svg` |
| 2026-08-22 | Product filters: removed Apply button; instant category/sort, debounced search, price on blur |
| 2026-08-22 | **IP-based locale currency** — `getLocaleFn`, `price()` via `useShop()`, INR base in DB |
| 2026-08-23 | Renamed `ProductImage` → `Image`; WCAG pass on forms, nav, filters, focus styles |
| 2026-08-23 | Product listing infinite scroll; `locale.ts` split from server imports (client hydration fix) |
| 2026-08-23 | Nav account dropdown; admin: no Orders/Wishlist/cart; notifications badge fix for admin |
| 2026-08-23 | Admin dashboard: stat buttons open single panel; view/edit/delete actions; `/account` + `/notifications` redirect for admin; delete APIs for products, orders, users, alerts |
| 2026-08-23 | Admin orders row: stacked layout — total on header row, status + actions on second row |
| 2026-08-23 | Header breadcrumb centered between logo and nav links; path-based labels with parent links |
| 2026-08-23 | Admin delete fix: all panels refetch after delete; errors surface via alert |
| 2026-08-23 | Cloudinary migration: all product images, fonts, fallback; admin product photo upload/remove |

---

## Agent checklist (when editing code)

1. Implement change in code/schema/API/routes.
2. Run `pnpm build` if types or routes touched.
3. **Update this file** — especially §6 Catalogue, §4/§10 if features change, and §14 Changelog.
4. Never store shopper data in `localStorage` / `sessionStorage`.
