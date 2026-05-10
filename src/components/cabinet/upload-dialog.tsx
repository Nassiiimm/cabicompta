"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  X,
  Loader2,
  Sparkles,
  CheckCircle,
} from "lucide-react";

type Company = {
  id: string;
  name: string;
};

const CATEGORIES = [
  { value: "BANK_STATEMENT", label: "Relevé bancaire" },
  { value: "INVOICE", label: "Facture" },
  { value: "TAX_NOTICE", label: "Avis de cotisation" },
  { value: "FINANCIAL_STATEMENT", label: "État financier" },
  { value: "TPS_TVQ", label: "TPS/TVQ" },
  { value: "CORPORATE", label: "Document corporatif" },
  { value: "CONTRACT", label: "Contrat" },
  { value: "RECEIPT", label: "Reçu" },
  { value: "OTHER", label: "Autre" },
] as const;

export function UploadDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [fiscalYear, setFiscalYear] = useState(
    new Date().getFullYear().toString()
  );
  const [companies, setCompanies] = useState<Company[]>([]);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<Record<string, unknown> | null>(
    null
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/clients")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setCompanies(data);
        })
        .catch(() => {});
    }
  }, [open]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
      }
    },
    []
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setScanResult(null);
  }, []);

  const handleScan = async () => {
    if (files.length === 0) return;
    setScanning(true);
    setScanResult(null);
    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Échec de l'analyse");
      const data = await res.json();
      setScanResult(data);
      if (data.category) {
        setCategory(data.category);
      }
    } catch {
      setError("Erreur lors de l'analyse IA");
    } finally {
      setScanning(false);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || !companyId) {
      setError("Sélectionnez un fichier et une entreprise");
      return;
    }

    setUploading(true);
    setError("");

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("companyId", companyId);
        formData.append("category", category);
        formData.append("fiscalYear", fiscalYear);

        const res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erreur de téléversement");
        }
      }

      setFiles([]);
      setCompanyId("");
      setCategory("OTHER");
      setScanResult(null);
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur de téléversement"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setCompanyId("");
    setCategory("OTHER");
    setFiscalYear(new Date().getFullYear().toString());
    setScanResult(null);
    setError("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleReset}
      />
      <div className="relative bg-background border rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Téléverser un document</h2>
          <button
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            }`}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">
              Glissez vos fichiers ici ou{" "}
              <label className="text-primary cursor-pointer hover:underline">
                parcourez
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileInput}
                />
              </label>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, images, Word, Excel — max 10 Mo
            </p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-md bg-muted"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {(file.size / 1024 / 1024).toFixed(2)} Mo
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-muted-foreground hover:text-destructive shrink-0 ml-2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Company select */}
          <div className="space-y-2">
            <Label htmlFor="company">Entreprise</Label>
            <select
              id="company"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Sélectionner une entreprise</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category select */}
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Fiscal year */}
          <div className="space-y-2">
            <Label htmlFor="fiscalYear">Année fiscale</Label>
            <Input
              id="fiscalYear"
              type="number"
              min="2020"
              max="2030"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
            />
          </div>

          {/* AI Scan button */}
          {files.length > 0 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleScan}
              disabled={scanning}
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {scanning ? "Analyse en cours..." : "Scanner avec l'IA"}
            </Button>
          )}

          {/* Scan result */}
          {scanResult && (
            <div className="rounded-md border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Analyse terminée
                </span>
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-32">
                {JSON.stringify(scanResult, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 p-6 border-t">
          <Button variant="outline" onClick={handleReset} disabled={uploading}>
            Annuler
          </Button>
          <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {uploading ? "Téléversement..." : "Téléverser"}
          </Button>
        </div>
      </div>
    </div>
  );
}
