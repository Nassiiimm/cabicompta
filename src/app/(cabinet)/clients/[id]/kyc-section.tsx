"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, CheckCircle2, Plus, Loader2 } from "lucide-react";

type KycDoc = {
  id: string;
  companyId: string;
  adminName: string;
  adminRole: string;
  documentType: string;
  verified: boolean;
  verifiedAt: string | null;
  notes: string | null;
  createdAt: string;
};

const DOCUMENT_TYPES = [
  { value: "PASSPORT", label: "Passeport" },
  { value: "DRIVERS_LICENSE", label: "Permis de conduire" },
  { value: "HEALTH_CARD", label: "Carte d'assurance maladie" },
  { value: "OTHER", label: "Autre" },
];

const DOC_TYPE_LABELS: Record<string, string> = {
  PASSPORT: "Passeport",
  DRIVERS_LICENSE: "Permis de conduire",
  HEALTH_CARD: "Carte d'assurance maladie",
  OTHER: "Autre",
};

export function KycSection({
  companyId,
  kycVerified,
  conflictCheck,
}: {
  companyId: string;
  kycVerified: boolean;
  conflictCheck: boolean;
}) {
  const [docs, setDocs] = useState<KycDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Form state
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [documentType, setDocumentType] = useState("PASSPORT");
  const [notes, setNotes] = useState("");

  // KYC status state
  const [localKycVerified, setLocalKycVerified] = useState(kycVerified);
  const [localConflictCheck, setLocalConflictCheck] = useState(conflictCheck);
  const [conflictNotes, setConflictNotes] = useState("");

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch(`/api/kyc?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setDocs(data);
      }
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          adminName,
          adminRole,
          documentType,
          notes: notes || undefined,
        }),
      });
      if (res.ok) {
        setAdminName("");
        setAdminRole("");
        setDocumentType("PASSPORT");
        setNotes("");
        setShowForm(false);
        fetchDocs();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(docId: string) {
    setVerifyingId(docId);
    try {
      const res = await fetch(`/api/kyc/${docId}`, {
        method: "PATCH",
      });
      if (res.ok) {
        fetchDocs();
      }
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleKycStatusChange(field: string, value: boolean | string) {
    const body: Record<string, unknown> = {};
    if (field === "kycVerified") {
      body.kycVerified = value;
      setLocalKycVerified(value as boolean);
    } else if (field === "conflictCheck") {
      body.conflictCheck = value;
      setLocalConflictCheck(value as boolean);
    } else if (field === "conflictCheckNotes") {
      body.conflictCheckNotes = value;
    }

    await fetch(`/api/clients/${companyId}/kyc-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const inputClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {localKycVerified ? (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          )}
          Conformité KYC
          {localKycVerified ? (
            <Badge variant="default" className="ml-2">Vérifié</Badge>
          ) : (
            <Badge variant="destructive" className="ml-2">Non vérifié</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Conflict of interest */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={localConflictCheck}
              onChange={(e) =>
                handleKycStatusChange("conflictCheck", e.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            Vérification de conflit d&apos;intérêts effectuée
          </label>
          <div className="ml-6">
            <textarea
              className={`${inputClass} min-h-[60px] resize-none`}
              placeholder="Notes sur le conflit d'intérêts..."
              value={conflictNotes}
              onChange={(e) => setConflictNotes(e.target.value)}
              onBlur={() => {
                if (conflictNotes) {
                  handleKycStatusChange("conflictCheckNotes", conflictNotes);
                }
              }}
              rows={2}
            />
          </div>
        </div>

        {/* KYC Documents */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              Pièces d&apos;identité des administrateurs
            </h3>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="size-3" />
              Ajouter
            </button>
          </div>

          {/* Add form */}
          {showForm && (
            <form onSubmit={handleAdd} className="rounded-lg border p-4 mb-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Nom de l&apos;administrateur
                  </label>
                  <input
                    className={inputClass}
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    required
                    placeholder="Jean Dupont"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Rôle
                  </label>
                  <input
                    className={inputClass}
                    value={adminRole}
                    onChange={(e) => setAdminRole(e.target.value)}
                    required
                    placeholder="Président, Administrateur..."
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Type de document
                </label>
                <select
                  className={inputClass}
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Notes (optionnel)
                </label>
                <input
                  className={inputClass}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Numéro de document, date d'expiration..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="size-3 mr-1 animate-spin" />}
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          {/* Documents list */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune pièce d&apos;identité enregistrée.
            </p>
          ) : (
            <div className="rounded-lg border divide-y">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{doc.adminName}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.adminRole} — {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                    </p>
                    {doc.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{doc.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {doc.verified ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="size-3" />
                        Vérifié
                      </Badge>
                    ) : (
                      <button
                        onClick={() => handleVerify(doc.id)}
                        disabled={verifyingId === doc.id}
                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50 transition-colors"
                      >
                        {verifyingId === doc.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3" />
                        )}
                        Marquer vérifié
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
