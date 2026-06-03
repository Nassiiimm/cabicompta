import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sql, and, eq } from "drizzle-orm";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const createSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Courriel invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  role: z.enum(["STAFF", "INTERN", "ADMIN"]),
});

export async function GET() {
  try {
    const user = await requireAdmin();

    const staffUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.cabinetId, user.cabinetId), sql`${users.role} IN ('ADMIN', 'STAFF', 'INTERN')`))
      .orderBy(users.createdAt);

    return Response.json(staffUsers);
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

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();

    const body = await request.json();
    const data = createSchema.parse(body);

    // Check if email already exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.email} = ${data.email}`)
      .limit(1);

    if (existing) {
      return Response.json(
        { error: "Un utilisateur avec ce courriel existe déjà" },
        { status: 409 }
      );
    }

    // Create Supabase Auth user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { name: data.name },
      });

    if (authError || !authUser.user) {
      return Response.json(
        { error: authError?.message ?? "Erreur lors de la création du compte" },
        { status: 500 }
      );
    }

    // Create app user
    const [newUser] = await db
      .insert(users)
      .values({
        cabinetId: user.cabinetId,
        authId: authUser.user.id,
        email: data.email,
        name: data.name,
        role: data.role,
      })
      .returning();

    return Response.json(
      {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        tempPassword: data.password,
        message: `Compte ${data.role === "ADMIN" ? "administrateur" : data.role === "INTERN" ? "stagiaire" : "comptable"} créé pour ${data.name}.`,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
