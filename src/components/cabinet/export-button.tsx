"use client";

import { Download } from "lucide-react";

export function ExportButton({ href, label }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      <Download className="size-3" />
      {label ?? "CSV"}
    </a>
  );
}
