import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** Récupère (ou crée) le jeton d'abonnement iCal de l'utilisateur. */
export async function getOrCreateCalendarToken(userId: string): Promise<string> {
  const [u] = await db.select({ token: users.calendarToken }).from(users).where(eq(users.id, userId)).limit(1);
  if (u?.token) return u.token;
  const token = randomUUID();
  await db.update(users).set({ calendarToken: token }).where(eq(users.id, userId));
  return token;
}

/** Régénère le jeton (révoque l'ancien lien). */
export async function rotateCalendarToken(userId: string): Promise<string> {
  const token = randomUUID();
  await db.update(users).set({ calendarToken: token }).where(eq(users.id, userId));
  return token;
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

type Deadline = { id: string; label: string; dueDate: string; type: string; status: string; companyName: string | null };

/** Construit un flux iCalendar (VCALENDAR) à partir d'échéances. */
export function buildIcs(deadlines: Deadline[], cabinetName: string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CabiCompta//Echeances//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc("Échéances " + cabinetName)}`,
  ];
  for (const d of deadlines) {
    const date = String(d.dueDate).slice(0, 10).replace(/-/g, ""); // YYYYMMDD (all-day)
    lines.push(
      "BEGIN:VEVENT",
      `UID:${d.id}@cabicompta`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${date}`,
      `SUMMARY:${esc(d.label + (d.companyName ? " — " + d.companyName : ""))}`,
      `DESCRIPTION:${esc(`Type : ${d.type} · Statut : ${d.status}`)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
