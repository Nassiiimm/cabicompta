"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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

type CompanyData = {
  id: string;
  name: string;
  neq: string | null;
  arcNumber: string | null;
  rqNumber: string | null;
  fiscalYearEnd: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  notes: string | null;
};

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<CompanyData | null>(null);

  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await fetch(`/api/clients/${id}`);
        if (!res.ok) throw new Error("Client introuvable");
        const data = await res.json();
        setClient(data);
      } catch {
        setError("Impossible de charger le client");
      } finally {
        setFetching(false);
      }
    }
    fetchClient();
  }, [id]);

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
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Erreur lors de la mise a jour");
      }

      router.push(`/clients/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">
          {error || "Client introuvable"}
        </p>
        <Link href="/clients" className={buttonVariants({ variant: "outline" })}>
          Retour aux clients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link
          href={`/clients/${id}`}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Modifier {client.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Mettre a jour les informations du client
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
                defaultValue={client.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="neq">NEQ</Label>
              <Input
                id="neq"
                name="neq"
                defaultValue={client.neq || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arcNumber">Numero ARC</Label>
              <Input
                id="arcNumber"
                name="arcNumber"
                defaultValue={client.arcNumber || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rqNumber">Numero RQ</Label>
              <Input
                id="rqNumber"
                name="rqNumber"
                defaultValue={client.rqNumber || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscalYearEnd">Fin d&apos;exercice fiscal</Label>
              <Input
                id="fiscalYearEnd"
                name="fiscalYearEnd"
                type="date"
                defaultValue={client.fiscalYearEnd || ""}
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
                defaultValue={client.address || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                name="city"
                defaultValue={client.city || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Input
                id="province"
                name="province"
                defaultValue={client.province || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Code postal</Label>
              <Input
                id="postalCode"
                name="postalCode"
                defaultValue={client.postalCode || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telephone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={client.phone || ""}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Courriel</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={client.email || ""}
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
                defaultValue={client.notes || ""}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link
            href={`/clients/${id}`}
            className={buttonVariants({ variant: "outline" })}
          >
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
