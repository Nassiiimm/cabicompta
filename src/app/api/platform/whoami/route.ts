import { getPlatformAdmin } from "@/lib/platform";

// Indique si la session courante est un administrateur PLATEFORME.
// Utilisé par la page de login pour router vers /platform.
export async function GET() {
  const pa = await getPlatformAdmin();
  return Response.json({ isPlatformAdmin: !!pa });
}
