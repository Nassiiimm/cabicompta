import { db } from "@/lib/db";
import { notifications, users, companyMembers, companies } from "@/lib/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { sendDocumentRequestEmail } from "@/lib/email";

export async function GET() {
  try {
    const user = await requireAuth();

    const items = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(20);

    const [unreadResult] = await db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, user.id),
          eq(notifications.read, false)
        )
      );

    return Response.json({
      notifications: items,
      unreadCount: unreadResult?.value ?? 0,
    });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const createSchema = z.object({
  userId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(["DEADLINE", "DOCUMENT", "INVOICE", "APPOINTMENT", "TASK", "SYSTEM"]),
  link: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (user.role === "CLIENT") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = createSchema.parse(body);

    // If companyId is provided, send to all members of that company
    if (data.companyId) {
      const members = await db
        .select({ userId: companyMembers.userId })
        .from(companyMembers)
        .where(eq(companyMembers.companyId, data.companyId));

      const toInsert = members.map((m) => ({
        userId: m.userId,
        title: data.title,
        message: data.message,
        type: data.type as "DEADLINE" | "DOCUMENT" | "INVOICE" | "APPOINTMENT" | "TASK" | "SYSTEM",
        link: data.link ?? null,
      }));

      if (toInsert.length > 0) {
        await db.insert(notifications).values(toInsert);
      }

      // Send email if document request
      if (data.type === "DOCUMENT") {
        const [company] = await db
          .select({ name: companies.name })
          .from(companies)
          .where(eq(companies.id, data.companyId))
          .limit(1);

        for (const m of members) {
          const [u] = await db
            .select({ email: users.email, name: users.name })
            .from(users)
            .where(eq(users.id, m.userId))
            .limit(1);

          if (u) {
            sendDocumentRequestEmail(u.email, u.name, company?.name ?? "votre société");
          }
        }
      }

      return Response.json({ sent: toInsert.length });
    }

    // Single user notification
    if (data.userId) {
      await db.insert(notifications).values({
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type as "DEADLINE" | "DOCUMENT" | "INVOICE" | "APPOINTMENT" | "TASK" | "SYSTEM",
        link: data.link ?? null,
      });
      return Response.json({ sent: 1 });
    }

    return Response.json({ error: "userId or companyId required" }, { status: 400 });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
