"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Camera, RotateCcw, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileScannerProps {
  onCapture: (files: File[]) => void;
  onClose: () => void;
}

// Amélioration légère pour OCR — contraste + netteté couleur sans dégradation
function enhanceForOcr(data: Uint8ClampedArray) {
  // Légère saturation pour rendre les textes plus lisibles
  const saturation = 1.1;
  // Contraste modéré — aide l'OCR sans brûler les détails
  const contrast = 1.08;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];

    // Boost saturation
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    r = lum + (r - lum) * saturation;
    g = lum + (g - lum) * saturation;
    b = lum + (b - lum) * saturation;

    // Contraste doux
    r = contrast * (r - 128) + 128;
    g = contrast * (g - 128) + 128;
    b = contrast * (b - 128) + 128;

    data[i]     = Math.min(255, Math.max(0, r));
    data[i + 1] = Math.min(255, Math.max(0, g));
    data[i + 2] = Math.min(255, Math.max(0, b));
  }
}

export function MobileScanner({ onCapture, onClose }: MobileScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [pages, setPages] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 3840 },
          height: { ideal: 2160 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setError("");
    } catch {
      setError("Impossible d'accéder à la caméra");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    // Amélioration légère pour OCR
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    enhanceForOcr(imageData.data);
    ctx.putImageData(imageData, 0, 0);

    // Qualité maximale pour extraction IA
    const dataUrl = canvas.toDataURL("image/jpeg", 0.97);
    setPreview(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const handleRetake = useCallback(() => {
    setPreview(null);
    startCamera();
  }, [startCamera]);

  const handleAddPage = useCallback(() => {
    if (!canvasRef.current || !preview) return;
    canvasRef.current.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `scan-p${pages.length + 1}-${Date.now()}.jpg`, { type: "image/jpeg" });
        setPages((prev) => [...prev, file]);
        setPreview(null);
        startCamera();
      },
      "image/jpeg",
      0.97
    );
  }, [preview, pages.length, startCamera]);

  const handleConfirm = useCallback(() => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `scan-p${pages.length + 1}-${Date.now()}.jpg`, { type: "image/jpeg" });
        const allFiles = [...pages, file];
        stopCamera();
        onCapture(allFiles);
      },
      "image/jpeg",
      0.97
    );
  }, [pages, stopCamera, onCapture]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
        <div className="text-center text-white p-6">
          <p className="mb-4 text-sm">{error}</p>
          <Button variant="outline" onClick={handleClose} className="text-white border-white/30">Fermer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">Scanner</span>
          {pages.length > 0 && (
            <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pages.length} page{pages.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button onClick={handleClose} className="text-white p-1.5 rounded-full hover:bg-white/20" aria-label="Fermer">
          <X className="size-5" />
        </button>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${preview ? "hidden" : ""}`}
        />
        <canvas
          ref={canvasRef}
          className={`max-w-full max-h-full object-contain ${preview ? "" : "hidden"}`}
        />

        {/* Corner guides — visible only when camera is live */}
        {!preview && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-[85%] h-[75%]">
              {/* Coins */}
              {[
                "top-0 left-0 border-t-2 border-l-2",
                "top-0 right-0 border-t-2 border-r-2",
                "bottom-0 left-0 border-b-2 border-l-2",
                "bottom-0 right-0 border-b-2 border-r-2",
              ].map((cls, i) => (
                <div key={i} className={`absolute w-6 h-6 border-white ${cls}`} />
              ))}
              <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/60 text-xs">
                Alignez le document
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-6 py-5 pb-8 bg-black/60 absolute bottom-0 left-0 right-0 flex items-center justify-center gap-8">
        {!preview ? (
          <button
            onClick={handleCapture}
            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Capturer"
          >
            <Camera className="size-6 text-white" />
          </button>
        ) : (
          <>
            <button
              onClick={handleRetake}
              className="flex flex-col items-center gap-1 text-white/70 hover:text-white"
            >
              <RotateCcw className="size-6" />
              <span className="text-[10px]">Reprendre</span>
            </button>
            <button
              onClick={handleAddPage}
              className="flex flex-col items-center gap-1 text-white/70 hover:text-white"
            >
              <div className="w-12 h-12 rounded-full border-2 border-white/50 flex items-center justify-center">
                <Plus className="size-5" />
              </div>
              <span className="text-[10px]">Page +</span>
            </button>
            <button
              onClick={handleConfirm}
              className="flex flex-col items-center gap-1 text-white"
            >
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                <Check className="size-6 text-black" />
              </div>
              <span className="text-[10px]">Confirmer</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
