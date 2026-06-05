import { z } from "zod";
import { provisionCabinetWithAdmin } from "@/lib/provisioning";

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

    try {
      const { cabinetId, adminUserId } = await provisionCabinetWithAdmin(input);
      return Response.json(
        { cabinetId, adminUserId, slug: input.slug, adminEmail: input.adminEmail },
        { status: 201 }
      );
    } catch (err) {
      const msg =
        err instanceof Error && /unique|duplicate/i.test(err.message)
          ? "Slug ou courriel déjà utilisé"
          : err instanceof Error
            ? err.message
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
