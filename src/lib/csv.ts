/**
 * Génère un CSV à partir d'un tableau d'objets.
 * Gère les virgules, guillemets et retours à la ligne dans les valeurs.
 */
export function generateCsv(
  headers: { key: string; label: string }[],
  rows: Record<string, unknown>[]
): string {
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map((h) => escape(h.label)).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => escape(row[h.key])).join(",")
  );

  return [headerLine, ...dataLines].join("\n");
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
