import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { hasCompanyAccess } from "@/lib/authz";
import { db } from "@/lib/db";
import { documents, companies, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft, FileText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS } from "@/lib/document-categories";
import { AnalysisView } from "@/components/cabinet/analysis-view";
import { AnalyzeButton } from "./analyze-button";
import type { StoredAnalysis } from "@/lib/analysis/types";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireStaff();
  const { id } = await params;

  const [doc] = await db
    .select({
      id: documents.id, fileName: documents.fileName, category: documents.category,
      subcategory: documents.subcategory, fiscalYear: documents.fiscalYear, status: documents.status,
      extractedData: documents.extractedData, companyId: documents.companyId,
      companyName: companies.name, uploaderName: users.name, createdAt: documents.createdAt,
      cabinetId: documents.cabinetId, deletedAt: documents.deletedAt,
    })
    .from(documents)
    .leftJoin(companies, eq(documents.companyId, companies.id))
    .leftJoin(users, eq(documents.uploadedBy, users.id))
    .where(eq(documents.id, id))
    .limit(1);

  if (!doc || doc.deletedAt || doc.cabinetId !== user.cabinetId) notFound();
  if (!(await hasCompanyAccess(user, doc.companyId))) notFound();

  const analysis = (doc.extractedData ?? null) as StoredAnalysis | null;
  const hasAnalysis = analysis && typeof analysis === "object" && "analysisKey" in analysis;

  return (
    <div className="max-w-4xl space-y-5">
      <Link href="/documents" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="size-3.5 mr-1" /> Documents
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <FileText className="size-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold break-words">{doc.fileName}</h1>
            <p className="text-sm text-muted-foreground">
              {doc.companyName ?? "—"}
              {doc.fiscalYear ? ` · ${doc.fiscalYear}` : ""}
              {doc.createdAt ? ` · ${new Date(doc.createdAt).toLocaleDateString("fr-CA")}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-[10px]">
            {CATEGORY_LABELS[doc.category ?? "OTHER"] ?? doc.category}
          </Badge>
          <a
            href={`/api/documents/${doc.id}/view`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Voir le fichier
          </a>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-medium">Analyse IA</h2>
        <AnalyzeButton documentId={doc.id} />
        <p className="text-xs text-muted-foreground">
          L'analyse via l'app utilise l'API Anthropic (facturée à l'usage). Pour l'analyse en lot
          gratuite, utilise le Claude du poste (abonnement Max) via le serveur MCP.
        </p>
      </div>

      <div className="rounded-lg border p-4">
        {hasAnalysis ? (
          <AnalysisView analysis={analysis as StoredAnalysis} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune analyse pour ce document. Choisis un type ci-dessus et lance l'analyse.
          </p>
        )}
      </div>
    </div>
  );
}
