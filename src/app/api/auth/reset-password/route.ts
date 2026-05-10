import { createClient } from "@/lib/supabase/server";
import { rateLimitByIp } from "@/lib/rate-limit";
import { z } from "zod";

const requestSchema = z.object({
  email: z.string().email(),
});

const updateSchema = z.object({
  password: z.string().min(8),
});

// Request password reset (sends email via Supabase)
export async function POST(request: Request) {
  try {
    if (!rateLimitByIp(request, 5, 300000)) {
      return Response.json({ error: "Trop de requêtes" }, { status: 429 });
    }

    const body = await request.json();
    const { email } = requestSchema.parse(body);

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });

    // Always return 200 to prevent email enumeration
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}

// Update password (after clicking reset link)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { password } = updateSchema.parse(body);

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return Response.json({ error: "Impossible de mettre à jour le mot de passe" }, { status: 400 });
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Mot de passe invalide (8 caractères minimum)" }, { status: 400 });
  }
}
