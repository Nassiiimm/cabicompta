import type {
  StoredAnalysis, InvoicesResult, BankStatementResult, PayrollResult,
  T4Result, T4AResult, SalesResult, FinancialResult, FinancialDetailedResult, GenericResult,
} from "@/lib/analysis/types";

const money = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n || 0);

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-medium text-muted-foreground px-2 py-1.5">{children}</th>;
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td className={`px-2 py-1.5 ${right ? "text-right tabular-nums" : ""}`}>{children}</td>;
}
function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full text-sm border rounded-lg overflow-hidden">{children}</table>;
}

/** Affiche le résultat d'analyse stocké dans documents.extractedData, selon le type. */
export function AnalysisView({ analysis }: { analysis: StoredAnalysis }) {
  const { analysisKey, result, analyzedAt, source } = analysis;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Analyse : <strong className="text-foreground">{analysisKey}</strong></span>
        <span>·</span>
        <span>{source === "web" ? "via l'app" : "via le poste (Claude)"}</span>
        <span>·</span>
        <span>{new Date(analyzedAt).toLocaleString("fr-CA")}</span>
        {(result as { tronque?: boolean }).tronque && (
          <span className="text-amber-600">· ⚠️ réponse possiblement tronquée</span>
        )}
      </div>
      {render(analysisKey, result)}
    </div>
  );
}

function render(key: StoredAnalysis["analysisKey"], result: StoredAnalysis["result"]) {
  switch (key) {
    case "INVOICES": {
      const r = result as InvoicesResult;
      return (
        <Table>
          <thead><tr className="border-b bg-muted/30">
            <Th>Fournisseur</Th><Th>Date</Th><Th>Description</Th><Th>HT</Th><Th>TPS</Th><Th>TVQ</Th><Th>TTC</Th>
          </tr></thead>
          <tbody>
            {r.factures.map((f, i) => (
              <tr key={i} className="border-b last:border-0">
                <Td>{f.fournisseur}</Td><Td>{f.date}</Td><Td>{f.description}</Td>
                <Td right>{money(f.montant_ht)}</Td><Td right>{money(f.tps)}</Td><Td right>{money(f.tvq)}</Td><Td right>{money(f.ttc)}</Td>
              </tr>
            ))}
            <tr className="font-medium bg-muted/30">
              <Td>Total</Td><Td>{""}</Td><Td>{""}</Td>
              <Td right>{money(r.resume.total_ht)}</Td><Td right>{money(r.resume.total_tps)}</Td>
              <Td right>{money(r.resume.total_tvq)}</Td><Td right>{money(r.resume.total_ttc)}</Td>
            </tr>
          </tbody>
        </Table>
      );
    }
    case "BANK_STATEMENT": {
      const r = result as BankStatementResult;
      if (r.est_amazon_fba && r.amazon) {
        const a = r.amazon;
        return (
          <div className="space-y-3">
            <p className="text-sm font-medium">Relevé Amazon FBA — {a.periode_debut} → {a.periode_fin}</p>
            <Table>
              <thead><tr className="border-b bg-muted/30"><Th>Frais</Th><Th>HT</Th><Th>TPS récup.</Th><Th>TVQ récup.</Th></tr></thead>
              <tbody>
                {a.frais.map((f, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <Td>{f.description}</Td><Td right>{money(f.montant_ht)}</Td>
                    <Td right>{money(f.tps_recuperable)}</Td><Td right>{money(f.tvq_recuperable)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="text-sm grid grid-cols-2 gap-x-6 gap-y-1">
              <span className="text-muted-foreground">Revenus totaux</span><span className="text-right tabular-nums">{money(a.revenus.total_revenus)}</span>
              <span className="text-muted-foreground">Frais HT</span><span className="text-right tabular-nums">{money(a.resume.total_frais_ht)}</span>
              <span className="text-muted-foreground">Profits nets</span><span className="text-right tabular-nums">{money(a.resume.profits_nets)}</span>
              <span className="text-muted-foreground">Versé au vendeur</span><span className="text-right tabular-nums">{money(a.resume.montant_verse_vendeur)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{a.note}</p>
          </div>
        );
      }
      return (
        <Table>
          <thead><tr className="border-b bg-muted/30"><Th>Date</Th><Th>Description</Th><Th>Catégorie</Th><Th>Montant</Th><Th>TPS/TVQ</Th></tr></thead>
          <tbody>
            {r.transactions.map((t, i) => (
              <tr key={i} className="border-b last:border-0">
                <Td>{t.date}</Td><Td>{t.fournisseur || t.description}</Td><Td>{t.categorie}</Td>
                <Td right>{money(t.montant_ttc)}</Td>
                <Td>{t.tps_tvq_applicable ? "Oui" : "Non"}{t.deductible_50 ? " (50%)" : ""}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      );
    }
    case "PAYROLL_DAS": {
      const r = result as PayrollResult;
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Période : {r.periode || "—"}</p>
          <Table>
            <thead><tr className="border-b bg-muted/30"><Th>Employé</Th><Th>NAS</Th><Th>Brut</Th><Th>Impôt féd.</Th><Th>Impôt prov.</Th></tr></thead>
            <tbody>
              {r.employes.map((e, i) => (
                <tr key={i} className="border-b last:border-0">
                  <Td>{e.prenom} {e.nom}</Td><Td>{e.nas || "—"}</Td>
                  <Td right>{money(e.salaire_brut)}</Td><Td right>{money(e.impot_federal)}</Td><Td right>{money(e.impot_provincial)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      );
    }
    case "T4_RL1": {
      const r = result as T4Result;
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Année : {r.annee ?? "—"}</p>
          <Table>
            <thead><tr className="border-b bg-muted/30"><Th>Employé</Th><Th>NAS</Th><Th>Revenus</Th><Th>Impôt féd.</Th><Th>Impôt QC</Th></tr></thead>
            <tbody>
              {r.employes.map((e, i) => (
                <tr key={i} className="border-b last:border-0">
                  <Td>{e.prenom} {e.nom}</Td><Td>{e.nas || "—"}</Td>
                  <Td right>{money(e.salaire_brut)}</Td><Td right>{money(e.impot_federal)}</Td><Td right>{money(e.impot_quebec)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      );
    }
    case "T4A": {
      const r = result as T4AResult;
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Année : {r.annee ?? "—"}</p>
          <Table>
            <thead><tr className="border-b bg-muted/30"><Th>Bénéficiaire</Th><Th>NAS/NEQ</Th><Th>Case</Th><Th>Montant</Th><Th>Impôt</Th></tr></thead>
            <tbody>
              {r.beneficiaires.map((b, i) => (
                <tr key={i} className="border-b last:border-0">
                  <Td>{b.nom}</Td><Td>{b.nas || b.neq || "—"}</Td><Td>{b.case}</Td>
                  <Td right>{money(b.montant)}</Td><Td right>{money(b.impot)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      );
    }
    case "SALES": {
      const r = result as SalesResult;
      return <p className="text-sm">Total des ventes TTC : <strong>{money(r.total_ventes_ttc)}</strong></p>;
    }
    case "FINANCIAL": {
      const r = result as FinancialResult;
      return (
        <div className="grid sm:grid-cols-2 gap-4">
          <KeyVals title="Revenus" obj={r.revenus} />
          <KeyVals title="Dépenses" obj={r.depenses} />
        </div>
      );
    }
    case "FINANCIAL_DETAILED": {
      const r = result as FinancialDetailedResult;
      return <KeyVals title="États financiers" obj={r.donnees} />;
    }
    default: {
      const r = result as GenericResult;
      return (
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">Catégorie détectée : <strong className="text-foreground">{r.category}</strong></p>
          <pre className="text-xs bg-muted/30 rounded-lg p-3 overflow-auto">{JSON.stringify(r.data, null, 2)}</pre>
        </div>
      );
    }
  }
}

function KeyVals({ title, obj }: { title: string; obj: Record<string, number> }) {
  const entries = Object.entries(obj).filter(([, v]) => v !== 0);
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{title}</p>
      <div className="text-sm grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5">
        {entries.length === 0 && <span className="text-muted-foreground col-span-2">—</span>}
        {entries.map(([k, v]) => (
          <span key={k} className="contents">
            <span className="text-muted-foreground">{k.replace(/^(er_|bil_|flux_)/, "").replace(/_/g, " ")}</span>
            <span className="text-right tabular-nums">{money(v)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
