"use client";

import { useState, useCallback, useEffect } from "react";
import { Upload, FileText, X, Loader2, Check, Camera, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileScanner } from "./mobile-scanner";

export function PortalUploadZone({ companyId }: { companyId: string }) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploaded, setUploaded] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);

  // Detect camera availability
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        if (devices.some((d) => d.kind === "videoinput")) {
          setHasCamera(true);
        }
      }).catch(() => {});
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  }, []);

  const remove = useCallback((i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setError("");
    setUploaded(0);
    try {
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData();
        fd.append("file", files[i]);
        fd.append("companyId", companyId);
        fd.append("fiscalYear", new Date().getFullYear().toString());
        const res = await fetch("/api/documents", { method: "POST", body: fd });
        if (!res.ok) throw new Error((await res.json()).error || "Erreur");
        setUploaded(i + 1);
      }
      setFiles([]);
      setTimeout(() => { setUploaded(0); window.location.reload(); }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setUploading(false);
    }
  };

  if (uploaded > 0 && files.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 dark:border-green-800/40 bg-green-50 dark:bg-green-950/20 p-6 text-center">
        <Check className="size-5 mx-auto mb-2 text-green-600" />
        <p className="text-sm font-medium text-green-900 dark:text-green-200">
          {uploaded} fichier{uploaded > 1 ? "s" : ""} envoyé{uploaded > 1 ? "s" : ""}
        </p>
        <p className="text-xs text-green-700 dark:text-green-400 mt-1">
          Votre comptable sera notifié dès réception.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showScanner && (
        <MobileScanner
          onCapture={(file) => {
            setFiles((prev) => [...prev, file]);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed py-8 px-4 text-center transition-colors cursor-pointer ${
          dragActive ? "border-foreground/30 bg-muted/50" : "border-border hover:border-foreground/20"
        }`}
      >
        <Upload className="size-5 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm">
          Glissez vos fichiers ou{" "}
          <label className="text-foreground underline underline-offset-4 cursor-pointer">
            parcourez
            <input type="file" className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv" onChange={handleInput} />
          </label>
        </p>
        <div className="mt-3 sm:hidden flex items-center justify-center gap-4">
          <label className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4 cursor-pointer">
            <Camera className="size-4" />
            Photo
            <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleInput} />
          </label>
          {hasCamera && (
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4 cursor-pointer"
            >
              <ScanLine className="size-4" />
              Scanner
            </button>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="rounded-lg border p-3 space-y-1.5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{f.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024 / 1024).toFixed(1)} Mo</span>
              </div>
              <button onClick={() => remove(i)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="size-3" />
              </button>
            </div>
          ))}
          {error && <p className="text-xs text-destructive px-1">{error}</p>}
          <Button className="w-full mt-1" onClick={handleUpload} disabled={uploading}>
            {uploading ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Envoi {uploaded}/{files.length}</>
              : <>Envoyer {files.length} fichier{files.length > 1 ? "s" : ""}</>}
          </Button>
        </div>
      )}
    </div>
  );
}
