import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { fiscalDeadlines, companies } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { DeadlinesCalendar } from "@/components/cabinet/deadlines-calendar";
import { Zap } from "lucide-react";

export default async function DeadlinesPage() {
  const user = await requireStaff();

  const rows = await db
    .select({
      id: fiscalDeadlines.id,
      label: fiscalDeadlines.label,
      dueDate: fiscalDeadlines.dueDate,
      status: fiscalDeadlines.status,
      companyId: fiscalDeadlines.companyId,
      companyName: companies.name,
    })
    .from(fiscalDeadlines)
    .innerJoin(companies, eq(fiscalDeadlines.companyId, companies.id))
    .where(and(eq(fiscalDeadlines.cabinetId, user.cabinetId), isNull(fiscalDeadlines.deletedAt)));

  const deadlines = rows.map((r) => ({
    ...r,
    dueDate: String(r.dueDate).slice(0, 10),
  }));

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold">Échéances fiscales</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Vue calendrier de toutes les échéances clients.</p>
        </div>
        <Link href="/autopilot" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors mt-1">
          <Zap className="size-3" />
          Pilote automatique
        </Link>
      </div>
      <DeadlinesCalendar deadlines={deadlines} />
    </div>
  );
}
