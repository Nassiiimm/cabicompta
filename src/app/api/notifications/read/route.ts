import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

// Mark single notification as read
export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const { id } = await request.json();

    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(eq(notifications.id, id), eq(notifications.userId, user.id))
      );

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// Mark all as read
export async function POST() {
  try {
    const user = await requireAuth();

    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.userId, user.id),
          eq(notifications.read, false)
        )
      );

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
