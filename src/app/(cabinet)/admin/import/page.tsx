import { requireAdmin } from "@/lib/auth";
import { ImportForm } from "./import-form";

export default async function ImportClientsPage() {
  await requireAdmin();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Importer des clients</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importez vos clients depuis un fichier CSV (export Sage 50, Excel…).
        </p>
      </div>

      <div className="rounded-lg border p-4 text-sm space-y-2">
        <p className="font-medium">Format attendu (1ʳᵉ ligne = en-têtes)</p>
        <code className="block text-xs bg-muted rounded p-2 overflow-x-auto whitespace-nowrap">
          Nom,NEQ,Type,Adresse,Ville,Code postal,Téléphone,Courriel
        </code>
        <p className="text-xs text-muted-foreground">
          Seul <b>Nom</b> est obligatoire. <b>Type</b> : <code>T1_PARTICULIER</code>,{" "}
          <code>T1_AUTONOME</code> ou <code>T2_SOCIETE</code>. Les doublons (même NEQ ou nom) sont
          ignorés — l'import est donc rejouable sans risque.
        </p>
      </div>

      <ImportForm />
    </div>
  );
}
