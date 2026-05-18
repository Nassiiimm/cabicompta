import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const { locale } = await request.json();
  if (locale !== "fr" && locale !== "en") {
    return Response.json({ error: "Invalid locale" }, { status: 400 });
  }
  const cookieStore = await cookies();
  cookieStore.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  return Response.json({ locale });
}
