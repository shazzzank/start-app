import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq } from 'drizzle-orm';
import { requireUser } from '@/app/server/auth';
import { db } from '@/app/server/db';
import { notifications } from '@/app/server/schema';

export const getNotificationsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser();
  if (user) {
    const rows = await db.select().from(notifications)
      .where(eq(notifications.user_id, user.id))
      .orderBy(desc(notifications.created_at));
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      read: row.read,
      createdAt: row.created_at?.toISOString() ?? '',
    }));
  }
  return [];
});

export const markNotificationReadFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    if (user) {
      await db.update(notifications).set({ read: true })
        .where(and(eq(notifications.id, data.id), eq(notifications.user_id, user.id)));
      return { ok: true as const };
    }
    return { ok: false as const };
  });
