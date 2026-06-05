"use client";

import { useState } from "react";
import { deleteCabinetAction } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeleteCabinetForm({ id, slug }: { id: string; slug: string }) {
  const [confirm, setConfirm] = useState("");
  return (
    <form action={deleteCabinetAction} className="flex items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="space-y-1">
        <label htmlFor="confirmSlug" className="text-xs text-muted-foreground">
          Tapez <code className="font-mono">{slug}</code> pour confirmer
        </label>
        <Input
          id="confirmSlug"
          name="confirmSlug"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={slug}
          className="h-8 text-sm w-56"
          autoComplete="off"
        />
      </div>
      <Button type="submit" size="sm" variant="destructive" disabled={confirm !== slug}>
        Supprimer définitivement
      </Button>
    </form>
  );
}
