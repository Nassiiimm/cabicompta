import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Public routes
  const publicRoutes = ["/login", "/register", "/"];
  if (publicRoutes.includes(path)) {
    return supabaseResponse;
  }

  // Routes qui gèrent leur PROPRE authentification (crons via CRON_SECRET,
  // webhooks via signature). Elles sont appelées sans cookie de session :
  // sans cette exception, le proxy les redirigerait vers /login (307) et les
  // crons Vercel + webhooks ne s'exécuteraient jamais. On laisse le handler
  // appliquer son contrôle d'accès.
  const selfAuthRoutes = [
    "/api/fiscal/check-deadlines",
    "/api/fiscal/check-invoices",
    "/api/fiscal/auto-reminders",
    "/api/workflows/check-overdue",
  ];
  if (
    selfAuthRoutes.includes(path) ||
    path === "/api/health" ||
    path.startsWith("/api/webhooks/") ||
    path.startsWith("/api/platform/") ||
    path.startsWith("/api/calendar/")
  ) {
    return supabaseResponse;
  }

  // Not authenticated → redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
