"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Invoice = {
  id: string;
  invoiceNumber: string;
  total: string;
  status: string;
  dueDate: string | null;
  issuedAt: Date | null;
};

const STATUS: Record<string, { label: string; class: string }> = {
  PAID: { label: "Payée", class: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/30" },
  SENT: { label: "À payer", class: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30" },
  OVERDUE: { label: "En retard", class: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/30" },
  DRAFT: { label: "Brouillon", class: "text-muted-foreground bg-muted" },
  CANCELLED: { label: "Annulée", class: "text-muted-foreground bg-muted" },
};

export function PortalInvoiceList({ invoices }: { invoices: Invoice[] }) {
  const [payingId, setPayingId] = useState<string | null>(null);

  const handlePay = async (invoiceId: string) => {
    setPayingId(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payment-link`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Erreur lors de la génération du lien de paiement");
        return;
      }
      const { paymentUrl } = await res.json();
      if (paymentUrl) {
        window.location.href = paymentUrl;
      }
    } catch {
      alert("Erreur réseau");
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="rounded-lg border divide-y">
      {invoices.map((inv) => {
        const s = STATUS[inv.status] ?? STATUS.DRAFT;
        const canPay = inv.status === "SENT" || inv.status === "OVERDUE";
        return (
          <div key={inv.id} className="flex items-center justify-between px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">{inv.invoiceNumber}</p>
              {inv.dueDate && (
                <p className="text-xs text-muted-foreground">
                  {new Date(inv.dueDate).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
                </p>
              )}
            </div>
            <div className="text-right flex items-center gap-2">
              <span className="text-sm font-semibold">
                {Number(inv.total).toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}
              </span>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${s.class}`}>
                {s.label}
              </span>
              {canPay && (
                <Button
                  size="xs"
                  onClick={() => handlePay(inv.id)}
                  disabled={payingId !== null}
                >
                  {payingId === inv.id ? (
                    <Loader2 className="size-3 animate-spin mr-1" />
                  ) : (
                    <CreditCard className="size-3 mr-1" />
                  )}
                  Payer
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
