import Link from "next/link";
import { db } from "@/lib/db";
import { documents, companies, users } from "@/lib/db/schema";
import { desc, eq, ilike, and, isNull } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { DocumentsActions } from "./documents-actions";
import { DocumentSearch } from "./document-search";

const CATEGORY_LABELS: Record<string, string> = {
  BANK_STATEMENT: "Relevé bancaire",
  INVOICE: "Facture",
  TAX_NOTICE: "Avis de cotisation",
  FINANCIAL_STATEMENT: "État financier",
  TPS_TVQ: "TPS/TVQ",
  CORPORATE: "Corporatif",
  CONTRACT: "Contrat",
  RECEIPT: "Reçu",
  OTHER: "Autre",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PROCESSED: "Traité",
  REJECTED: "Rejeté",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PROCESSED: "default",
  REJECTED: "destructive",
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const conditions = q
    ? and(
        isNull(documents.deletedAt),
        ilike(documents.fileName, `%${q}%`)
      )
    : isNull(documents.deletedAt);

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

      <DocumentSearch defaultValue={q} />

      {docs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <FileText className="size-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {q ? `Aucun résultat pour "${q}"` : "Aucun document"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FileText className="size-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{doc.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.companyName ?? "—"}
                    {doc.fiscalYear ? ` · ${doc.fiscalYear}` : ""}
                    {" · "}
                    {doc.uploaderName ?? "—"}
                    {" · "}
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("fr-CA") : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Badge variant="secondary" className="text-[10px]">
                  {CATEGORY_LABELS[doc.category ?? "OTHER"] ?? doc.category}
                </Badge>
                <Badge variant={STATUS_VARIANT[doc.status] ?? "outline"} className="text-[10px]">
                  {STATUS_LABELS[doc.status] ?? doc.status}
                </Badge>
                <a
                  href={`/api/documents/${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voir
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
