import { getCurrentUser } from "@/lib/auth";
import { logAccess } from "@/lib/access-log";
import { rateLimitByIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
  if (!rateLimitByIp(request, 10, 60000)) {
    return Response.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  logAccess({
    userId: user.id,
    action: "LOGIN",
    resourceType: "session",
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return Response.json({ role: user.role });
}
