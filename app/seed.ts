import { eq, sql } from 'drizzle-orm';
import { db } from '@/app/config';
import { products, sessions, shopUsers } from '@/app/db-schema';
import { hashPassword } from '@/app/auth';
import type { Product, ProductCategory, SeedProduct } from '@/app/types';

const categoryDefaults: Record<ProductCategory, string> = {
  Stationery: '/products/stationery/notebook.jpg',
  Home: '/products/home/mug.jpg',
  Bags: '/products/bags/tote.jpg',
  Wear: '/products/wear/tee.jpg',
};

const imageRules: Record<ProductCategory, [RegExp, string][]> = {
  Stationery: [
    [/fountain/i, '/products/stationery/fountain-pen.jpg'],
    [/notebook|journal|planner|pad|grid|dot|weekly/i, '/products/stationery/notebook.jpg'],
    [/pen|pencil|brush|calligraphy|ink|mechanical/i, '/products/stationery/pen.jpg'],
    [/case/i, '/products/stationery/pencil-case.jpg'],
    [/paper|envelope|correspondence/i, '/products/stationery/paper.jpg'],
    [/tape|washi/i, '/products/stationery/tape.jpg'],
    [/sketch/i, '/products/stationery/sketch-pad.jpg'],
    [/sticky|memo|note|flag|index/i, '/products/stationery/sticky-notes.jpg'],
    [/mat/i, '/products/stationery/desk-mat.jpg'],
    [/stamp/i, '/products/stationery/stamp.jpg'],
    [/clip|binder/i, '/products/stationery/clips.jpg'],
  ],
  Home: [
    [/mug/i, '/products/home/mug.jpg'],
    [/incense/i, '/products/home/incense.jpg'],
    [/tray|coaster|frame|hook|matchbox|soap/i, '/products/home/tray.jpg'],
    [/lamp|light|timer/i, '/products/home/lamp.jpg'],
    [/cushion|blanket|towel|rug/i, '/products/home/cushion.jpg'],
    [/bowl|plate/i, '/products/home/bowl.jpg'],
    [/tea|pot/i, '/products/home/teapot.jpg'],
    [/candle/i, '/products/home/incense.jpg'],
    [/jar|spice|storage|diffuser|spray/i, '/products/home/jar.jpg'],
    [/vase|bookend/i, '/products/home/vase.jpg'],
  ],
  Bags: [
    [/tote|market|grocery|basket|shopper|wine|field/i, '/products/bags/tote.jpg'],
    [/pouch|wallet|passport|leather/i, '/products/bags/pouch.jpg'],
    [/weekender|commuter|daypack|bike|sling|bento/i, '/products/bags/weekender.jpg'],
    [/backpack|pack/i, '/products/bags/backpack.jpg'],
    [/drawstring|gym|sack/i, '/products/bags/pouch.jpg'],
    [/sleeve|laptop/i, '/products/bags/sleeve.jpg'],
    [/organizer|tool|document|roll|case/i, '/products/bags/organizer.jpg'],
    [/shoulder/i, '/products/bags/shoulder.jpg'],
  ],
  Wear: [
    [/apron|smock|denim/i, '/products/wear/apron.jpg'],
    [/scarf|bandana|handkerchief/i, '/products/wear/scarf.jpg'],
    [/tee|shirt|kimono|fleece|pullover|merino|layer|vest|utility|crossback|work/i, '/products/wear/tee.jpg'],
    [/trouser|pants|lounge|short/i, '/products/wear/trousers.jpg'],
    [/beanie|mitten|wool/i, '/products/wear/beanie.jpg'],
    [/sock|tabi/i, '/products/wear/socks.jpg'],
    [/cap/i, '/products/wear/cap.jpg'],
    [/jacket|patch|poncho|rain/i, '/products/wear/jacket.jpg'],
    [/mask|eye|sleep|silk/i, '/products/wear/scarf.jpg'],
    [/clog|garden|house/i, '/products/wear/socks.jpg'],
  ],
};

const categoryStems: Record<ProductCategory, string[]> = {
  Stationery: [
    'Field Notebook', 'Ink Pen Set', 'Desk Journal', 'Pencil Case', 'Letter Paper Pack',
    'Washi Tape Set', 'Sketch Pad', 'Sticky Note Block', 'Brush Pen', 'Desk Mat',
    'Index Cards', 'Fountain Pen', 'Memo Roll', 'Stamp Set', 'Envelope Pack',
    'Grid Notebook', 'Calligraphy Kit', 'Binder Clips', 'Page Flags', 'Ink Refill',
    'Dot Grid Pad', 'Weekly Planner', 'Mechanical Pencil', 'Rubber Stamp', 'Correspondence Set',
  ],
  Home: [
    'Night Mug', 'Incense Stand', 'Entry Tray', 'Table Lamp', 'Linen Cushion',
    'Ceramic Bowl', 'Tea Pot', 'Candle Holder', 'Wall Hook Set', 'Storage Jar',
    'Coaster Set', 'Throw Blanket', 'Diffuser Bottle', 'Serving Plate', 'Vase',
    'Bookends', 'Kitchen Timer', 'Spice Jar Set', 'Bath Towel', 'Room Spray',
    'Matchbox Cover', 'Soap Dish', 'Picture Frame', 'Wool Rug Sample', 'Night Light',
  ],
  Bags: [
    'Market Tote', 'Crossbody Pouch', 'Weekender Bag', 'Canvas Backpack', 'Drawstring Bag',
    'Laptop Sleeve', 'Bento Bag', 'Sling Pack', 'Travel Organizer', 'Grocery Tote',
    'Leather Pouch', 'Foldable Shopper', 'Bike Bag', 'Passport Wallet', 'Tool Roll',
    'Shoulder Bag', 'Mini Backpack', 'Wine Tote', 'Gym Sack', 'Document Case',
    'Basket Tote', 'Commuter Pack', 'Patchwork Tote', 'Field Bag', 'Daypack',
  ],
  Wear: [
    'Studio Apron', 'Linen Scarf', 'Cotton Tee', 'Work Shirt', 'Wide Trousers',
    'Knit Beanie', 'House Socks', 'Bandana Set', 'Lounge Pants', 'Canvas Cap',
    'Wool Mittens', 'Summer Kimono Top', 'Crossback Smock', 'Utility Vest', 'Sleep Mask',
    'Tabi Socks', 'Patch Jacket', 'Easy Shorts', 'Merino Layer', 'Garden Clogs',
    'Handkerchief Set', 'Rain Poncho', 'Fleece Pullover', 'Denim Tote Apron', 'Silk Eye Mask',
  ],
};

const prefixes = ['Seoul', 'Osaka', 'Hanji', 'Kyoto', 'Busan', 'Dawn', 'Studio', 'Market', 'Quiet', 'Brass', 'Linen', 'Ceramic', 'Solar', 'Midnight', 'River'];

const summaries: Record<ProductCategory, string[]> = {
  Stationery: [
    'Lay-flat pages with a soft cover.',
    'Balanced weight for daily writing.',
    'Compact enough for a coat pocket.',
    'Made for slow correspondence.',
    'Thread-bound and easy to open flat.',
  ],
  Home: [
    'Matte finish with a deep base tone.',
    'Minimal form for everyday rituals.',
    'Hand-friendly scale for tabletops.',
    'Pairs well with morning light.',
    'Built to age gently with use.',
  ],
  Bags: [
    'Wide straps and a reinforced base.',
    'Lightweight carry for market runs.',
    'Interior pocket keeps essentials sorted.',
    'Folds flat when not in use.',
    'Canvas body with clean seam lines.',
  ],
  Wear: [
    'Cross-back straps and a relaxed fit.',
    'Washed fabric with a soft hand.',
    'Easy layering for studio days.',
    'Adjustable where it matters.',
    'Designed for work and rest alike.',
  ],
};

function productImage(stem: string, category: ProductCategory) {
  const rules = imageRules[category];
  for (const [pattern, path] of rules) {
    if (pattern.test(stem)) return path;
  }
  return categoryDefaults[category];
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const baseProducts: SeedProduct[] = [
  {
    slug: 'hanji-field-notebook',
    name: 'Hanji Field Notebook',
    category: 'Stationery',
    summary: 'Lay-flat pages with a soft teal cover.',
    description: 'A compact notebook inspired by traditional paper craft. 120gsm pages, thread-bound spine, and a cover that ages with use.',
    price: 890,
    stock: 42,
    image: '/products/stationery/notebook.jpg',
  },
  {
    slug: 'osaka-night-mug',
    name: 'Osaka Night Mug',
    category: 'Home',
    summary: 'Matte ceramic with a deep base tone.',
    description: '350ml ceramic mug finished in a Solarized-inspired glaze. Dishwasher safe and balanced for daily tea or coffee.',
    price: 1290,
    stock: 28,
    image: '/products/home/mug.jpg',
  },
  {
    slug: 'seoul-market-tote',
    name: 'Seoul Market Tote',
    category: 'Bags',
    summary: 'Wide straps and a reinforced base panel.',
    description: 'Cotton canvas tote with interior pocket. Built for market runs, studio days, and weekend errands.',
    price: 1590,
    stock: 19,
    image: '/products/bags/tote.jpg',
  },
  {
    slug: 'ceramic-incense-stand',
    name: 'Ceramic Incense Stand',
    category: 'Home',
    summary: 'Minimal holder with a stable ash tray.',
    description: 'Hand-formed ceramic stand with a shallow basin. Pairs with stick or cone incense.',
    price: 740,
    stock: 35,
    image: '/products/home/incense.jpg',
  },
  {
    slug: 'linen-studio-apron',
    name: 'Linen Studio Apron',
    category: 'Wear',
    summary: 'Cross-back straps and deep front pocket.',
    description: 'Washed linen apron with adjustable fit. Designed for kitchen work, pottery, or print sessions.',
    price: 2190,
    stock: 14,
    image: '/products/wear/apron.jpg',
  },
  {
    slug: 'brass-entry-tray',
    name: 'Brass Entry Tray',
    category: 'Home',
    summary: 'Rounded corners and a soft brushed finish.',
    description: 'A catch-all tray for keys, cards, and small objects. Finished to develop a gentle patina over time.',
    price: 2490,
    stock: 11,
    image: '/products/home/tray.jpg',
  },
];

function buildCatalog() {
  const catalog: SeedProduct[] = [...baseProducts];
  const usedSlugs = new Set(catalog.map((item) => item.slug));
  (Object.keys(categoryStems) as ProductCategory[]).forEach((category) => {
    categoryStems[category].forEach((stem, index) => {
      const prefix = prefixes[index % prefixes.length];
      const name = `${prefix} ${stem}`;
      let slug = slugify(name);
      let suffix = 1;
      while (usedSlugs.has(slug)) {
        slug = `${slugify(name)}-${suffix}`;
        suffix += 1;
      }
      usedSlugs.add(slug);
      if (catalog.some((item) => item.slug === slug)) return;
      const summaryPool = summaries[category];
      catalog.push({
        slug,
        name,
        category,
        summary: summaryPool[index % summaryPool.length],
        description: `${name} from the Start ${category.toLowerCase()} collection. ${summaryPool[index % summaryPool.length]} Ships from our shared warehouse with live stock and order tracking.`,
        price: 590 + ((index * 137 + category.length * 41) % 2400),
        stock: 5 + ((index * 17 + prefix.length) % 45),
        image: productImage(stem, category),
      });
    });
  });
  return catalog;
}

export const catalog = buildCatalog();

let seeded = false;

const legacySlugs = ['hanji-notebook', 'osaka-mug', 'seoul-tote', 'ceramic-incense', 'linen-apron', 'brass-tray'];

export async function ensureSeed() {
  if (seeded) return;

  for (const slug of legacySlugs) {
    await db.delete(products).where(eq(products.slug, slug));
  }

  try {
    await db.execute(sql`update start_api_products set partner_id = null where partner_id is not null`);
  } catch { /* partner_id column removed */ }
  const partners = await db.select({ id: shopUsers.id }).from(shopUsers).where(sql`${shopUsers.role} = 'partner'`);
  for (const row of partners) {
    await db.delete(sessions).where(eq(sessions.user_id, row.id));
    await db.delete(shopUsers).where(eq(shopUsers.id, row.id));
  }

  {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      const [legacy] = await db.select({ id: shopUsers.id }).from(shopUsers).where(eq(shopUsers.email, 'admin@start.local')).limit(1);
      if (legacy) {
        await db.delete(sessions).where(eq(sessions.user_id, legacy.id));
        await db.delete(shopUsers).where(eq(shopUsers.id, legacy.id));
      }
      const passwordHash = hashPassword(adminPassword);
      const [admin] = await db.select().from(shopUsers).where(eq(shopUsers.role, 'admin')).limit(1);
      if (admin) {
        admin.email !== adminEmail && await db.delete(sessions).where(eq(sessions.user_id, admin.id));
        await db.update(shopUsers).set({ name: 'Admin', email: adminEmail, password_hash: passwordHash }).where(eq(shopUsers.id, admin.id));
      } else {
        await db.insert(shopUsers).values({
          id: crypto.randomUUID(),
          name: 'Admin',
          email: adminEmail,
          password_hash: passwordHash,
          role: 'admin',
        });
      }
    }

    const existing = await db.select({ slug: products.slug }).from(products);
    const existingSlugs = new Set(existing.map((row) => row.slug));
    const missing = catalog.filter((item) => !existingSlugs.has(item.slug));
    if (missing.length) {
      await db.insert(products).values(missing.map((item) => ({
        id: crypto.randomUUID(),
        ...item,
      })));
    }

    seeded = true;
  }
}

export function mapProduct(row: {
  id: string;
  slug: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  price: number;
  stock: number;
  image: string;
}): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    summary: row.summary,
    description: row.description,
    price: row.price,
    stock: row.stock,
    image: row.image,
  };
}
