import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents, companies, users } from "@/lib/db/schema";
import { desc, eq, ilike, and, isNull } from "drizzle-orm";
import { FileText, Upload } from "lucide-react";
import { DocumentsActions } from "./documents-actions";
import { DocumentSearch } from "./document-search";
import { DocumentFilters } from "./document-filters";
import { DocumentListActions } from "./document-list-actions";
import { getTranslations } from "next-intl/server";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; companyId?: string; category?: string; subcategory?: string }>;
}) {
  await requireStaff();
  const t = await getTranslations("documents");
  const { q, status, companyId, category, subcategory } = await searchParams;

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

  const VALID_CATEGORIES = ["DAS", "TPS_TVQ", "FINANCIAL_STATEMENT", "T1", "REQ_DOC", "IMMOBILISATION", "BANK_STATEMENT", "INVOICE", "TAX_NOTICE", "CORPORATE", "CONTRACT", "RECEIPT", "OTHER"] as const;
  if (category && VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
    filters.push(eq(documents.category, category as typeof VALID_CATEGORIES[number]));
  }

  if (subcategory && ["A", "B", "C"].includes(subcategory)) {
    filters.push(eq(documents.subcategory, subcategory));
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
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <DocumentsActions />
      </div>

      <DocumentFilters currentStatus={status} currentCategory={category} currentSubcategory={subcategory} />
      <DocumentSearch defaultValue={q} />

      {docs.length === 0 ? (
        (q || status || companyId || category || subcategory) ? (
          <div className="text-center py-12 border rounded-lg">
            <FileText className="size-6 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {q ? t("noResultSearch", { query: q }) : t("noResultFilter")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 border rounded-lg text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Upload className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium mb-1">{t("noDocuments")}</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs">
              {t("noDocumentsDesc")}
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
