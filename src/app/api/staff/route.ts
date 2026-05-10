import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { or, eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    await requireStaff();

    const staff = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(or(eq(users.role, "ADMIN"), eq(users.role, "STAFF")))
      .orderBy(asc(users.name));

    return Response.json(staff);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
