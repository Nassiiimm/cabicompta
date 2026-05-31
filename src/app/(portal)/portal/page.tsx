import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  documents,
  companyMembers,
  companies,
  fiscalDeadlines,
  documentRequests,
} from "@/lib/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { PortalUploadZone } from "@/components/portal/portal-upload-zone";
import { PortalDocumentList } from "@/components/portal/portal-document-list";
import { PortalGreeting } from "@/components/portal/portal-greeting";
import { PortalDocumentRequests } from "@/components/portal/portal-document-requests";
import { ArrowRight, Upload, MessageSquare, FileCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

async function getPortalData(userId: string) {
  const membership = await db
    .select({ companyId: companyMembers.companyId, companyName: companies.name })
    .from(companyMembers)
    .innerJoin(companies, eq(companyMembers.companyId, companies.id))
    .where(eq(companyMembers.userId, userId))
    .limit(1);

  if (membership.length === 0) return null;
  const { companyId, companyName } = membership[0];

  const [docCount] = await db
    .select({ total: count(), pending: sql<number>`count(*) filter (where ${documents.status} = 'PENDING')` })
    .from(documents)
    .where(eq(documents.companyId, companyId));

  const docList = await db
    .select({ id: documents.id, fileName: documents.fileName, fileSize: documents.fileSize, category: documents.category, status: documents.status, createdAt: documents.createdAt })
    .from(documents)
    .where(eq(documents.companyId, companyId))
    .orderBy(desc(documents.createdAt))
    .limit(10);

  const deadlines = await db
    .select({ id: fiscalDeadlines.id, label: fiscalDeadlines.label, dueDate: fiscalDeadlines.dueDate })
    .from(fiscalDeadlines)
    .where(and(eq(fiscalDeadlines.companyId, companyId), eq(fiscalDeadlines.status, "UPCOMING")))
    .orderBy(fiscalDeadlines.dueDate)
    .limit(3);

  const docRequestRows = await db
    .select({
      id: documentRequests.id,
      label: documentRequests.label,
      description: documentRequests.description,
      required: documentRequests.required,
      status: documentRequests.status,
      dueDate: documentRequests.dueDate,
    })
    .from(documentRequests)
    .where(eq(documentRequests.companyId, companyId))
    .orderBy(documentRequests.required, documentRequests.createdAt);

  const total = docCount?.total ?? 0;
  const pending = Number(docCount?.pending ?? 0);
  const processed = total - pending;
  const completionRate = total > 0 ? Math.round((processed / total) * 100) : 0;
  const docRequests = docRequestRows.map((r) => ({
    ...r,
    dueDate: r.dueDate ? String(r.dueDate).slice(0, 10) : null,
  }));
  return { companyId, companyName, totalDocs: total, pendingDocs: pending, completionRate, documents: docList, deadlines, docRequests };
}

export default async function PortalPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [data, t, tc] = await Promise.all([
    getPortalData(user.id),
    getTranslations("portal.home"),
    getTranslations("common"),
  ]);

  if (!data) {
    return (
      <div className="rounded-xl border-2 border-dashed p-8 text-center space-y-3 mt-8">
        <p className="text-sm font-medium">Compte non associé</p>
        <p className="text-sm text-muted-foreground">
          Votre compte n&apos;est pas encore associé à une entreprise.
          Votre comptable doit vous envoyer une invitation.
        </p>
        <p className="text-xs text-muted-foreground">
          Une question ?{" "}
          <a href="mailto:info@cfc-expertise.ca" className="underline hover:text-foreground transition-colors">
            Contactez-nous
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PortalGreeting
        firstName={user.name ? user.name.split(" ")[0] : ""}
        companyName={data.companyName}
      />

      {/* Deadlines + progress */}
      {(data.deadlines.length > 0 || data.totalDocs > 0) && (
        <div className="rounded-lg border p-4 space-y-3">
          {data.deadlines.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("deadlinesTitle")}</p>
              {data.deadlines.map((d) => {
                const daysLeft = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / 86400000);
                const urgent = daysLeft <= 7;
                return (
                  <div key={d.id} className={`flex items-center justify-between text-sm py-1.5 px-2 rounded-md -mx-2 ${urgent ? "bg-red-50 dark:bg-red-950/20" : ""}`}>
                    <span className={urgent ? "font-medium text-red-700 dark:text-red-400" : ""}>{d.label}</span>
                    <span className={`text-xs font-medium ${urgent ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                      {daysLeft <= 0 ? "Aujourd'hui !" : daysLeft === 1 ? "Demain !" : `${daysLeft}j`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {data.totalDocs > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Dossier complété</span>
                <span>{data.completionRate} %</span>
              </div>
              <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-neutral-900 dark:bg-white rounded-full transition-all" style={{ width: `${data.completionRate}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Demandes documentaires du comptable */}
      {data.docRequests.length > 0 && (
        <PortalDocumentRequests
          companyId={data.companyId}
          requests={data.docRequests}
        />
      )}

      {/* Upload libre */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">{t("uploadTitle")}</p>
        <PortalUploadZone companyId={data.companyId} />
      </div>

      {/* Documents */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">Documents ({data.totalDocs})</p>
          {data.totalDocs > 0 && (
            <Link href="/portal/documents" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              {tc("viewAll")} <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
        {data.documents.length > 0 ? (
          <PortalDocumentList documents={data.documents} />
        ) : (
          <div className="rounded-xl border-2 border-dashed p-6 space-y-4">
            <p className="text-sm font-medium text-center text-muted-foreground mb-2">Par où commencer ?</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Upload className="size-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">1. Déposez vos documents</p>
                  <p className="text-xs text-muted-foreground">Relevés bancaires, reçus, factures… utilisez la zone ci-dessous.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="size-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">2. Posez vos questions</p>
                  <p className="text-xs text-muted-foreground">Écrivez à votre comptable via l'onglet Messages.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <FileCheck className="size-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">3. Suivez votre dossier</p>
                  <p className="text-xs text-muted-foreground">Vos documents apparaîtront ici une fois traités.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
