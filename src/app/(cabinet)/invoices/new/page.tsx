"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";

type Client = {
  id: string;
  name: string;
};

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

const TPS_RATE = 0.05;
const TVQ_RATE = 0.09975;

function formatCAD(value: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

function generateTempId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyId, setCompanyId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { id: generateTempId(), description: "", quantity: 1, unitPrice: 0 },
  ]);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setClients(data);
      })
      .catch(() => {});
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: generateTempId(), description: "", quantity: 1, unitPrice: 0 },
    ]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));
  }, []);

  const updateItem = useCallback(
    (id: string, field: keyof Omit<LineItem, "id">, value: string | number) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        )
      );
    },
    []
  );

  // Calculated totals
  const lineSubtotals = items.map((item) => item.quantity * item.unitPrice);
  const totalHt = lineSubtotals.reduce((sum, v) => sum + v, 0);
  const tps = totalHt * TPS_RATE;
  const tvq = totalHt * TVQ_RATE;
  const totalTtc = totalHt + tps + tvq;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyId) {
      setError("Veuillez selectionner un client");
      return;
    }
    if (!dueDate) {
      setError("Veuillez indiquer une date d'echeance");
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      setError("Tous les articles doivent avoir une description");
      return;
    }
    if (items.some((i) => i.quantity <= 0 || i.unitPrice < 0)) {
      setError("Verifiez les quantites et prix unitaires");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          dueDate,
          notes: notes || undefined,
          items: items.map(({ description, quantity, unitPrice }) => ({
            description,
            quantity,
            unitPrice,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la creation");
      }

      const invoice = await res.json();
      router.push(`/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link
          href="/invoices"
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Nouvelle facture
          </h1>
          <p className="text-muted-foreground mt-1">
            Creer une facture pour un client
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Client & date */}
        <Card>
          <CardHeader>
            <CardTitle>Informations generales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyId">Client</Label>
              <select
                id="companyId"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Selectionner un client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Date d&apos;echeance</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Articles</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Header row */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_100px_120px_120px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>Description</span>
              <span className="text-right">Quantite</span>
              <span className="text-right">Prix unitaire</span>
              <span className="text-right">Sous-total</span>
              <span />
            </div>

            {items.map((item, idx) => (
              <div
                key={item.id}
                className="grid gap-2 sm:grid-cols-[1fr_100px_120px_120px_40px] items-start"
              >
                <div>
                  <Label className="sm:hidden text-xs text-muted-foreground mb-1">
                    Description
                  </Label>
                  <Input
                    placeholder="Description du service..."
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, "description", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label className="sm:hidden text-xs text-muted-foreground mb-1">
                    Qte
                  </Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "quantity",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="text-right"
                  />
                </div>
                <div>
                  <Label className="sm:hidden text-xs text-muted-foreground mb-1">
                    Prix unit.
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "unitPrice",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="text-right"
                  />
                </div>
                <div className="flex items-center justify-end h-8 text-sm font-medium">
                  {formatCAD(lineSubtotals[idx])}
                </div>
                <div className="flex items-center justify-center h-8">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total HT</span>
                <span className="font-medium">{formatCAD(totalHt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TPS (5 %)</span>
                <span>{formatCAD(tps)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVQ (9,975 %)</span>
                <span>{formatCAD(tvq)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>Total TTC</span>
                <span>{formatCAD(totalTtc)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Notes ou conditions de paiement..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/invoices"
            className={buttonVariants({ variant: "outline" })}
          >
            Annuler
          </Link>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Creer la facture
          </Button>
        </div>
      </form>
    </div>
  );
}
