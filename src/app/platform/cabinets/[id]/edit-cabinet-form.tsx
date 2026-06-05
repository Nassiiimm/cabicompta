"use client";

import { useActionState } from "react";
import { editCabinetAction, type ActionResult } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ActionResult = { ok: false };

type Cab = {
  id: string; name: string; displayName: string | null; plan: string;
  primaryColor: string | null; logoUrl: string | null; emailFrom: string | null;
};

export function EditCabinetForm({ cabinet }: { cabinet: Cab }) {
  const [state, formAction, pending] = useActionState(editCabinetAction, initial);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={cabinet.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="name" label="Nom" defaultValue={cabinet.name} />
        <Field name="displayName" label="Nom affiché (branding)" defaultValue={cabinet.displayName ?? ""} />
        <Field name="plan" label="Plan" defaultValue={cabinet.plan} />
        <Field name="primaryColor" label="Couleur (#hex)" defaultValue={cabinet.primaryColor ?? ""} />
        <Field name="logoUrl" label="URL du logo" defaultValue={cabinet.logoUrl ?? ""} />
        <Field name="emailFrom" label="Expéditeur email" defaultValue={cabinet.emailFrom ?? ""} />
      </div>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      {state.ok && <p className="text-xs text-green-700 dark:text-green-400">Enregistré ✓</p>}
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
    </form>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="text-xs">{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} className="h-8 text-sm" />
    </div>
  );
}
