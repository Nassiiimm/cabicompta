import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(
  _request: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await segmentData.params;

    // Find user
    const [user] = await db
      .select({ id: users.id, authId: users.authId, name: users.name })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return Response.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Prevent self-deletion
    if (user.id === admin.id) {
      return Response.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte" },
        { status: 400 }
      );
    }

    // Disable via Supabase Admin API (ban instead of delete)
    if (user.authId) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { error: banError } =
        await supabaseAdmin.auth.admin.updateUserById(user.authId, {
          ban_duration: "876600h", // ~100 years
        });

      if (banError) {
        return Response.json(
          { error: "Erreur lors de la désactivation du compte" },
          { status: 500 }
        );
      }
    }

    return Response.json({
      ok: true,
      message: `Le compte de ${user.name} a été désactivé.`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
