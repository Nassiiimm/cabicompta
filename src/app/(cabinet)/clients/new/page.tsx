"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      neq: formData.get("neq") as string,
      arcNumber: formData.get("arcNumber") as string,
      rqNumber: formData.get("rqNumber") as string,
      fiscalYearEnd: formData.get("fiscalYearEnd") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      province: formData.get("province") as string,
      postalCode: formData.get("postalCode") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      notes: formData.get("notes") as string,
    };

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Erreur lors de la création");
      }

      router.push("/clients");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link
          href="/clients"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nouveau client</h1>
          <p className="text-muted-foreground mt-1">
            Ajouter une nouvelle societe au cabinet
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations generales</CardTitle>
            <CardDescription>
              Identite et numeros d&apos;enregistrement de la societe
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nom de la societe *</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="Ex: ABC Inc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="neq">NEQ</Label>
              <Input
                id="neq"
                name="neq"
                placeholder="Numero d'entreprise du Quebec"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arcNumber">Numero ARC</Label>
              <Input
                id="arcNumber"
                name="arcNumber"
                placeholder="Numero d'affaires CRA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rqNumber">Numero RQ</Label>
              <Input
                id="rqNumber"
                name="rqNumber"
                placeholder="Numero Revenu Quebec"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscalYearEnd">Fin d&apos;exercice fiscal</Label>
              <Input
                id="fiscalYearEnd"
                name="fiscalYearEnd"
                type="date"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coordonnees</CardTitle>
            <CardDescription>Adresse et informations de contact</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                name="address"
                placeholder="123 rue Exemple"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input id="city" name="city" placeholder="Montreal" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Input
                id="province"
                name="province"
                defaultValue="QC"
                placeholder="QC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Code postal</Label>
              <Input
                id="postalCode"
                name="postalCode"
                placeholder="H2X 1Y4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telephone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(514) 555-0123"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Courriel</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="info@entreprise.ca"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes internes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Notes supplementaires sur ce client..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/clients" className={buttonVariants({ variant: "outline" })}>
            Annuler
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}
