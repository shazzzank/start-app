import { eq } from 'drizzle-orm';
import { db } from '@/app/server/db';
import { notifications, users } from '@/app/server/schema';

export async function notify(userId: string, title: string, body: string) {
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    userId,
    title,
    body,
  });
}

export async function notifyAdmins(title: string, body: string) {
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));
  await Promise.all(admins.map((admin) => notify(admin.id, title, body)));
}
