import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents, companyMembers, companies } from "@/lib/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PortalArchive } from "@/components/portal/portal-archive";

async function getArchiveData(userId: string) {
  const membership = await db
    .select({
      companyId: companyMembers.companyId,
      companyName: companies.name,
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companyMembers.companyId, companies.id))
    .where(eq(companyMembers.userId, userId))
    .limit(1);

  if (membership.length === 0) return null;
  const { companyId } = membership[0];

  const allDocs = await db
    .select({
      id: documents.id,
      fileName: documents.fileName,
      fileSize: documents.fileSize,
      category: documents.category,
      fiscalYear: documents.fiscalYear,
      status: documents.status,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.companyId, companyId))
    .orderBy(desc(documents.createdAt));

  // Get distinct years
  const years = [...new Set(allDocs.map((d) => d.fiscalYear).filter(Boolean))] as number[];
  years.sort((a, b) => b - a);

  return { documents: allDocs, years };
}

export default async function PortalDocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = await getArchiveData(user.id);
  if (!data) redirect("/portal");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Mes documents
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tous vos documents déposés et reçus
        </p>
      </div>

      <PortalArchive documents={data.documents} years={data.years} />
    </div>
  );
}
