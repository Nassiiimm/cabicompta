import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { AppUser } from "@/types";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await getSession();
  if (!session) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.authId, session.id))
    .limit(1);

  if (!user) return null;

  return {
    id: user.id,
    cabinetId: user.cabinetId,
    authId: user.authId!,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role as AppUser["role"],
    avatarUrl: user.avatarUrl,
    presenceNoticeAckedAt: user.presenceNoticeAckedAt,
    aiConsentAckedAt: user.aiConsentAckedAt,
  };
}

export async function requireAuth(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireStaff(): Promise<AppUser> {
  const user = await requireAuth();
  if (user.role === "CLIENT") throw new Error("Forbidden");
  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}
