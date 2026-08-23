import { eq } from 'drizzle-orm';
import { db } from '@/app/server/db';
import { notifications, shopUsers } from '@/app/server/schema';

export async function notify(userId: string, title: string, body: string) {
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    user_id: userId,
    title,
    body,
  });
}

export async function notifyAdmins(title: string, body: string) {
  const admins = await db.select({ id: shopUsers.id }).from(shopUsers).where(eq(shopUsers.role, 'admin'));
  await Promise.all(admins.map((admin) => notify(admin.id, title, body)));
}
