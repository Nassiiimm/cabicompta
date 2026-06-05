"use client";

import { useActionState } from "react";
import { createCabinetAction, type ActionResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ActionResult = { ok: false };

export function CreateCabinetForm() {
  const [state, formAction, pending] = useActionState(createCabinetAction, initial);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="name" className="text-xs">Nom du cabinet</Label>
          <Input id="name" name="name" required placeholder="Cabinet Tremblay" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="slug" className="text-xs">Slug (a-z, 0-9, -)</Label>
          <Input id="slug" name="slug" required placeholder="cabinet-tremblay" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="adminName" className="text-xs">Nom de l&apos;admin</Label>
          <Input id="adminName" name="adminName" required placeholder="Marie Tremblay" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="adminEmail" className="text-xs">Courriel de l&apos;admin</Label>
          <Input id="adminEmail" name="adminEmail" type="email" required placeholder="marie@cabinet.ca" className="h-8 text-sm" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="adminPassword" className="text-xs">Mot de passe temporaire (8+)</Label>
          <Input id="adminPassword" name="adminPassword" type="text" required minLength={8} placeholder="à communiquer à l'admin" className="h-8 text-sm" />
        </div>
      </div>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      {state.ok && <p className="text-xs text-green-700 dark:text-green-400">Cabinet créé ✓</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Création…" : "Créer le cabinet"}
      </Button>
    </form>
  );
}
