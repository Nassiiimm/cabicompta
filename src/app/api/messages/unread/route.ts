import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { portalMessages } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

// GET /api/messages/unread — nombre de conversations avec message client non répondu
export async function GET(_request: NextRequest) {
  try {
    await requireStaff();

    const [result] = await db.execute<{ count: number }>(sql`
      SELECT COUNT(DISTINCT company_id)::int AS count
      FROM portal_messages
      WHERE from_role = 'CLIENT' AND read_at IS NULL
    `);

    return Response.json({ count: result?.count ?? 0 });
  } catch {
    return Response.json({ count: 0 });
  }
}
