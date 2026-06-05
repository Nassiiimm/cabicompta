"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cabinets } from "@/lib/db/schema";
import { requirePlatformAdmin, logPlatformAction } from "@/lib/platform";
import { provisionCabinetWithAdmin, deleteCabinet } from "@/lib/provisioning";
import { revalidatePath } from "next/cache";

export type ActionResult = { ok: boolean; error?: string };

const createSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).max(63).regex(/^[a-z0-9-]+$/, "slug : minuscules, chiffres, tirets"),
  adminEmail: z.string().email(),
  adminName: z.string().min(2),
  adminPassword: z.string().min(8),
});

export async function createCabinetAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let admin;
  try { admin = await requirePlatformAdmin(); } catch { return { ok: false, error: "Accès refusé" }; }
  const parsed = createSchema.safeParse({
    name: formData.get("name"), slug: formData.get("slug"),
    adminEmail: formData.get("adminEmail"), adminName: formData.get("adminName"),
    adminPassword: formData.get("adminPassword"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  try {
    const { cabinetId } = await provisionCabinetWithAdmin(parsed.data);
    await logPlatformAction({ admin, action: "CABINET_CREATE", targetType: "cabinet", targetId: cabinetId, meta: { slug: parsed.data.slug, adminEmail: parsed.data.adminEmail } });
    revalidatePath("/platform/cabinets");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error && /unique|duplicate/i.test(e.message)
      ? "Slug ou courriel déjà utilisé" : e instanceof Error ? e.message : "Échec de la création";
    return { ok: false, error: msg };
  }
}

const editSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  displayName: z.string().optional(),
  plan: z.string().min(1),
  primaryColor: z.string().optional(),
  logoUrl: z.string().optional(),
  emailFrom: z.string().optional(),
});

export async function editCabinetAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let admin;
  try { admin = await requirePlatformAdmin(); } catch { return { ok: false, error: "Accès refusé" }; }
  const parsed = editSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  const { id, ...fields } = parsed.data;
  await db.update(cabinets).set({
    name: fields.name,
    displayName: fields.displayName || null,
    plan: fields.plan,
    primaryColor: fields.primaryColor || null,
    logoUrl: fields.logoUrl || null,
    emailFrom: fields.emailFrom || null,
    updatedAt: new Date(),
  }).where(eq(cabinets.id, id));
  await logPlatformAction({ admin, action: "CABINET_UPDATE", targetType: "cabinet", targetId: id, meta: fields });
  revalidatePath(`/platform/cabinets/${id}`);
  revalidatePath("/platform/cabinets");
  return { ok: true };
}

export async function setCabinetStatusAction(formData: FormData): Promise<void> {
  let admin;
  try { admin = await requirePlatformAdmin(); } catch { return; }
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
  await db.update(cabinets).set({ status, updatedAt: new Date() }).where(eq(cabinets.id, id));
  await logPlatformAction({ admin, action: status === "SUSPENDED" ? "CABINET_SUSPEND" : "CABINET_ACTIVATE", targetType: "cabinet", targetId: id });
  revalidatePath("/platform/cabinets");
  revalidatePath(`/platform/cabinets/${id}`);
}

export async function deleteCabinetAction(formData: FormData): Promise<void> {
  let admin;
  try { admin = await requirePlatformAdmin(); } catch { return; }
  const id = String(formData.get("id"));
  // Garde-fou : confirmation par saisie exacte du slug
  const [cab] = await db.select({ slug: cabinets.slug }).from(cabinets).where(eq(cabinets.id, id)).limit(1);
  if (!cab || String(formData.get("confirmSlug")) !== cab.slug) return;
  await deleteCabinet(id);
  await logPlatformAction({ admin, action: "CABINET_DELETE", targetType: "cabinet", targetId: id, meta: { slug: cab.slug } });
  revalidatePath("/platform/cabinets");
}
