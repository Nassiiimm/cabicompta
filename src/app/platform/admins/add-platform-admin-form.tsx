"use client";

import { useActionState } from "react";
import { addPlatformAdminAction, type ActionResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ActionResult = { ok: false };

export function AddPlatformAdminForm() {
  const [state, formAction, pending] = useActionState(addPlatformAdminAction, initial);
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="name" className="text-xs">Nom</Label>
          <Input id="name" name="name" required className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email" className="text-xs">Courriel</Label>
          <Input id="email" name="email" type="email" required className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password" className="text-xs">Mot de passe (8+)</Label>
          <Input id="password" name="password" type="text" required minLength={8} className="h-8 text-sm" />
        </div>
      </div>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      {state.ok && <p className="text-xs text-green-700 dark:text-green-400">Super-admin ajouté ✓</p>}
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Ajout…" : "Ajouter un super-admin"}</Button>
    </form>
  );
}
