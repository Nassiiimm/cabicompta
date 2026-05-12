import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents, companies, users } from "@/lib/db/schema";
import { desc, eq, ilike, and, isNull } from "drizzle-orm";
import { FileText, Upload } from "lucide-react";
import { DocumentsActions } from "./documents-actions";
import { DocumentSearch } from "./document-search";
import { DocumentFilters } from "./document-filters";
import { DocumentListActions } from "./document-list-actions";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; companyId?: string }>;
}) {
  await requireStaff();
  const { q, status, companyId } = await searchParams;

  const filters = [isNull(documents.deletedAt)];

  if (q) {
    filters.push(ilike(documents.fileName, `%${q}%`));
  }

  const validStatuses = ["PENDING", "PROCESSED", "REJECTED"] as const;
  if (status && validStatuses.includes(status as typeof validStatuses[number])) {
    filters.push(eq(documents.status, status as typeof validStatuses[number]));
  }

  if (companyId) {
    filters.push(eq(documents.companyId, companyId));
  }

  const conditions = and(...filters);

  const docs = await db
    .select({
      id: documents.id,
      fileName: documents.fileName,
      fileSize: documents.fileSize,
      category: documents.category,
      fiscalYear: documents.fiscalYear,
      status: documents.status,
      createdAt: documents.createdAt,
      companyName: companies.name,
      uploaderName: users.name,
    })
    .from(documents)
    .leftJoin(companies, eq(documents.companyId, companies.id))
    .leftJoin(users, eq(documents.uploadedBy, users.id))
    .where(conditions)
    .orderBy(desc(documents.createdAt))
    .limit(100);

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Documents</h1>
        <DocumentsActions />
      </div>

      <DocumentFilters currentStatus={status} />
      <DocumentSearch defaultValue={q} />

      {docs.length === 0 ? (
        (q || status || companyId) ? (
          <div className="text-center py-12 border rounded-lg">
            <FileText className="size-6 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {q ? `Aucun resultat pour "${q}"` : "Aucun resultat pour ce filtre"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 border rounded-lg text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Upload className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium mb-1">Aucun document</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs">
              Televersez votre premier document pour commencer a organiser vos fichiers.
            </p>
            <DocumentsActions />
          </div>
        )
      ) : (
        <DocumentListActions
          documents={docs.map((doc) => ({
            ...doc,
            createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
          }))}
        />
      )}
    </div>
  );
}
