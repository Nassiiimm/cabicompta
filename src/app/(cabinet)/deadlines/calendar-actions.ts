"use server";

import { requireAuth } from "@/lib/auth";
import { getOrCreateCalendarToken, rotateCalendarToken } from "@/lib/calendar";

function urlFor(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base}/api/calendar/${token}.ics`;
}

export async function getCalendarUrlAction(): Promise<string> {
  const user = await requireAuth();
  return urlFor(await getOrCreateCalendarToken(user.id));
}

export async function rotateCalendarUrlAction(): Promise<string> {
  const user = await requireAuth();
  return urlFor(await rotateCalendarToken(user.id));
}
