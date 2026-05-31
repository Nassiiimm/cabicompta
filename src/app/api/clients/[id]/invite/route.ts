import { requireStaff } from "@/lib/auth";
import { hasCompanyAccess } from "@/lib/authz";
import { db } from "@/lib/db";
import { users, companies, companyMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  memberRole: z.enum(["ADMINISTRATOR", "SHAREHOLDER", "CONTACT"]).default("ADMINISTRATOR"),
});

export async function POST(
  request: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStaff();
    const { id: companyId } = await segmentData.params;
    if (!(await hasCompanyAccess(user, companyId))) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }
    const body = await request.json();
    const data = schema.parse(body);

    // Verify company exists
    const [company] = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      return Response.json({ error: "Société introuvable" }, { status: 404 });
    }

    // Check if user already exists in app
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser) {
      // Check if already linked to this company
      const [existingMember] = await db
        .select()
        .from(companyMembers)
        .where(eq(companyMembers.userId, existingUser.id))
        .limit(1);

      if (existingMember && existingMember.companyId === companyId) {
        return Response.json({ error: "Cet utilisateur est déjà associé à cette société" }, { status: 409 });
      }

      // Link existing user to company
      await db.insert(companyMembers).values({
        companyId,
        userId: existingUser.id,
        role: data.memberRole as "ADMINISTRATOR" | "SHAREHOLDER" | "CONTACT",
        isPrimary: false,
      });

      return Response.json({ userId: existingUser.id, linked: true });
    }

    // Create Supabase Auth user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tempPassword = `CabiCompta-${Math.random().toString(36).slice(2, 10)}!`;

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: data.name },
    });

    if (authError || !authUser.user) {
      return Response.json({ error: authError?.message ?? "Erreur création compte" }, { status: 500 });
    }

    // Create app user
    const [newUser] = await db
      .insert(users)
      .values({
        authId: authUser.user.id,
        email: data.email,
        name: data.name,
        phone: data.phone ?? null,
        role: "CLIENT",
      })
      .returning();

    // Link to company
    await db.insert(companyMembers).values({
      companyId,
      userId: newUser.id,
      role: data.memberRole as "ADMINISTRATOR" | "SHAREHOLDER" | "CONTACT",
      isPrimary: true,
    });

    // Send welcome email
    await sendWelcomeEmail(data.email, data.name, tempPassword);

    return Response.json({
      userId: newUser.id,
      created: true,
      tempPassword,
      message: `Compte créé pour ${data.name}. Mot de passe temporaire : ${tempPassword}`,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Données invalides", details: error.issues }, { status: 400 });
    }
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
