"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle, Trash2, Loader2, FileDown } from "lucide-react";

interface InvoiceActionsProps {
  invoiceId: string;
  status: string;
}

export function InvoiceActions({ invoiceId, status }: InvoiceActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const updateStatus = async (newStatus: string) => {
    setLoading(newStatus);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) router.refresh();
    } catch {
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Archiver cette facture brouillon ?")) return;
    setLoading("DELETE");
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
      if (res.ok) router.push("/invoices");
    } catch {
    } finally {
      setLoading(null);
    }
  };

  const handlePdf = () => {
    window.open(`/api/invoices/${invoiceId}/pdf`, "_blank");
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handlePdf}>
        <FileDown className="h-4 w-4 mr-1" />
        PDF
      </Button>
      {status === "DRAFT" && (
        <>
          <Button
            size="sm"
            onClick={() => updateStatus("SENT")}
            disabled={loading !== null}
          >
            {loading === "SENT" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Envoyer
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={loading !== null}
          >
            {loading === "DELETE" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
            Archiver
          </Button>
        </>
      )}
      {(status === "SENT" || status === "OVERDUE") && (
        <Button
          size="sm"
          onClick={() => updateStatus("PAID")}
          disabled={loading !== null}
        >
          {loading === "PAID" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
          Marquer payée
        </Button>
      )}
    </div>
  );
}
