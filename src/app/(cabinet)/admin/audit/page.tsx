"use client";

import { useState, useEffect } from "react";
import { ExportButton } from "@/components/cabinet/export-button";
import { useTranslations } from "next-intl";

type AuditEntry = {
  id: string;
  action: string;
  tableName: string;
  recordId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
};

export default function AuditLogsPage() {
  const t = useTranslations("admin.audit");
  const tc = useTranslations("common");
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/audit-logs?limit=100")
      .then((r) => (r.ok ? r.json() : []))
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            Historique des modifications — Conformité Ordre des CPA
          </p>
        </div>
        <ExportButton href="/api/export/audit-logs" />
      </div>

      <div className="rounded-lg border">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">{tc("loading")}</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t("noLogs")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2 font-medium">{t("date")}</th>
                  <th className="px-3 py-2 font-medium">{t("user")}</th>
                  <th className="px-3 py-2 font-medium">{t("action")}</th>
                  <th className="px-3 py-2 font-medium">{t("table")}</th>
                  <th className="px-3 py-2 font-medium">Détails</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("fr-CA")}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {log.userName ?? log.userEmail ?? "Système"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        log.action === "SOFT_DELETE" ? "bg-red-50 text-red-700" :
                        log.action === "STATUS_CHANGE" ? "bg-amber-50 text-amber-700" :
                        log.action === "UPDATE" ? "bg-blue-50 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono">{log.tableName}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs truncate">
                      {log.newData ? JSON.stringify(log.newData).slice(0, 80) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
