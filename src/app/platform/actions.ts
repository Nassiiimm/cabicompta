"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cabinets } from "@/lib/db/schema";
import { getPlatformAdmin } from "@/lib/platform";
import { provisionCabinetWithAdmin } from "@/lib/provisioning";
import { revalidatePath } from "next/cache";

const createSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).max(63).regex(/^[a-z0-9-]+$/, "slug : minuscules, chiffres, tirets"),
  adminEmail: z.string().email(),
  adminName: z.string().min(2),
  adminPassword: z.string().min(8),
});

export type ActionResult = { ok: boolean; error?: string };

export async function createCabinetAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!(await getPlatformAdmin())) return { ok: false, error: "Accès refusé" };
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    adminEmail: formData.get("adminEmail"),
    adminName: formData.get("adminName"),
    adminPassword: formData.get("adminPassword"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };

  try {
    await provisionCabinetWithAdmin(parsed.data);
    revalidatePath("/platform");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error && /unique|duplicate/i.test(e.message)
      ? "Slug ou courriel déjà utilisé"
      : e instanceof Error ? e.message : "Échec de la création";
    return { ok: false, error: msg };
  }
}

export async function setCabinetStatusAction(formData: FormData): Promise<void> {
  if (!(await getPlatformAdmin())) return;
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
  await db.update(cabinets).set({ status, updatedAt: new Date() }).where(eq(cabinets.id, id));
  revalidatePath("/platform");
}
