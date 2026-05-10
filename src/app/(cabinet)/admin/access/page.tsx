"use client";

import { useState, useEffect } from "react";

type AccessEntry = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
};

export default function AccessLogsPage() {
  const [logs, setLogs] = useState<AccessEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/access-logs?limit=100")
      .then((r) => (r.ok ? r.json() : []))
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-lg font-semibold">Journal d'accès</h1>
      <p className="text-sm text-muted-foreground">
        Qui a accédé à quoi — Conformité Loi 25
      </p>

      <div className="rounded-lg border">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucune entrée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Utilisateur</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Ressource</th>
                  <th className="px-3 py-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("fr-CA")}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {log.userName ?? log.userEmail ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        log.action === "LOGIN" ? "bg-green-50 text-green-700" :
                        log.action === "DOCUMENT_DOWNLOAD" ? "bg-blue-50 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono">
                      {log.resourceType}{log.resourceId ? ` / ${log.resourceId.slice(0, 8)}…` : ""}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {log.ipAddress ?? "—"}
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
