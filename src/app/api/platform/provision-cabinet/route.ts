import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { provisionCabinet } from "@/lib/provisioning";

/**
 * Provisioning d'un cabinet — opéré par le PROPRIÉTAIRE DE LA PLATEFORME.
 *
 * Protégé par PLATFORM_ADMIN_SECRET (fail-closed : sans secret configuré, ou
 * sans en-tête correspondant, la route refuse). N'est PAS soumis à la session
 * (exclu du proxy). Crée le compte Auth du 1er admin puis la fiche cabinet.
 *
 * Exemple :
 *   curl -X POST $URL/api/platform/provision-cabinet \
 *     -H "Authorization: Bearer $PLATFORM_ADMIN_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"name":"Cabinet X","slug":"cabinet-x","adminEmail":"a@x.ca","adminName":"Admin X","adminPassword":"..."}'
 */

const schema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9-]+$/, "slug : minuscules, chiffres et tirets uniquement"),
  legalName: z.string().optional(),
  adminEmail: z.string().email(),
  adminName: z.string().min(2),
  adminPassword: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    // Auth plateforme — fail-closed
    const secret = process.env.PLATFORM_ADMIN_SECRET;
    const provided =
      request.headers.get("x-platform-secret") ??
      request.headers.get("authorization")?.replace("Bearer ", "");
    if (!secret || provided !== secret) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const input = schema.parse(body);

    // 1) Compte Supabase Auth du premier admin (service role)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: input.adminEmail,
      password: input.adminPassword,
      email_confirm: true,
      user_metadata: { name: input.adminName },
    });
    if (authError || !authUser.user) {
      return Response.json(
        { error: authError?.message ?? "Échec création du compte admin" },
        { status: 400 }
      );
    }

    // 2) Cabinet + ligne admin + templates par défaut (transaction)
    try {
      const { cabinetId, adminUserId } = await provisionCabinet({
        name: input.name,
        slug: input.slug,
        legalName: input.legalName,
        admin: { authId: authUser.user.id, email: input.adminEmail, name: input.adminName },
      });

      return Response.json(
        { cabinetId, adminUserId, slug: input.slug, adminEmail: input.adminEmail },
        { status: 201 }
      );
    } catch (dbErr) {
      // Rollback de l'auth si l'écriture DB échoue (ex. slug déjà pris) — évite un compte orphelin
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id).catch(() => {});
      const msg =
        dbErr instanceof Error && /unique|duplicate/i.test(dbErr.message)
          ? "Slug ou courriel déjà utilisé"
          : "Échec de la création du cabinet";
      return Response.json({ error: msg }, { status: 409 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Données invalides", details: error.issues }, { status: 400 });
    }
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
