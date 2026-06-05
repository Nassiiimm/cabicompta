"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { cabinets, platformAdmins } from "@/lib/db/schema";
import { requirePlatformAdmin, logPlatformAction } from "@/lib/platform";
import { provisionCabinetWithAdmin, deleteCabinet } from "@/lib/provisioning";
import { revalidatePath } from "next/cache";

const sbAdmin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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

// ─── Impersonation ("se connecter en tant que") ────────────────────────────
// Génère un magic link Supabase pour l'utilisateur cible et redirige dessus.
// ⚠️ Remplace la session courante du super-admin par celle de l'utilisateur.
export async function impersonateAction(formData: FormData): Promise<void> {
  const admin = await requirePlatformAdmin().catch(() => null);
  if (!admin) return;
  const email = String(formData.get("email"));
  const cabinetId = String(formData.get("cabinetId") || "");
  const { data, error } = await sbAdmin().auth.admin.generateLink({ type: "magiclink", email });
  const link = data?.properties?.action_link;
  if (error || !link) return;
  await logPlatformAction({ admin, action: "IMPERSONATE", targetType: "user", meta: { email, cabinetId } });
  redirect(link);
}

// ─── Gestion des super-admins plateforme ───────────────────────────────────
const adminSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
});

export async function addPlatformAdminAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let admin;
  try { admin = await requirePlatformAdmin(); } catch { return { ok: false, error: "Accès refusé" }; }
  const parsed = adminSchema.safeParse({ email: formData.get("email"), name: formData.get("name"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  const sb = sbAdmin();
  // Crée (ou récupère) le compte Auth, puis la ligne platform_admins
  let authId: string | undefined;
  const created = await sb.auth.admin.createUser({ email: parsed.data.email, password: parsed.data.password, email_confirm: true, user_metadata: { name: parsed.data.name } });
  if (created.data.user) authId = created.data.user.id;
  else {
    const { data: list } = await sb.auth.admin.listUsers({ perPage: 200 });
    authId = list.users.find((u) => u.email === parsed.data.email)?.id;
  }
  if (!authId) return { ok: false, error: "Échec création du compte" };
  try {
    await db.insert(platformAdmins).values({ authId, email: parsed.data.email, name: parsed.data.name });
  } catch {
    return { ok: false, error: "Ce super-admin existe déjà" };
  }
  await logPlatformAction({ admin, action: "PLATFORM_ADMIN_ADD", targetType: "platform_admin", meta: { email: parsed.data.email } });
  revalidatePath("/platform/admins");
  return { ok: true };
}

export async function setPlatformAdminActiveAction(formData: FormData): Promise<void> {
  let admin;
  try { admin = await requirePlatformAdmin(); } catch { return; }
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  // Garde-fou : ne pas se désactiver soi-même
  if (id === admin.id) return;
  await db.update(platformAdmins).set({ active }).where(eq(platformAdmins.id, id));
  await logPlatformAction({ admin, action: active ? "PLATFORM_ADMIN_ENABLE" : "PLATFORM_ADMIN_DISABLE", targetType: "platform_admin", targetId: id });
  revalidatePath("/platform/admins");
}
