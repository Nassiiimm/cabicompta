"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Camera, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileScannerProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function MobileScanner({ onCapture, onClose }: MobileScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captured, setCaptured] = useState(false);
  const [error, setError] = useState("");

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError("");
    } catch {
      setError("Impossible d'accéder à la caméra");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const processImage = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Grayscale + contrast enhancement
    for (let i = 0; i < data.length; i += 4) {
      // Luminance
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

      // Increase contrast: stretch around midpoint 128
      const contrast = 1.4;
      const adjusted = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));

      data[i] = adjusted;
      data[i + 1] = adjusted;
      data[i + 2] = adjusted;
    }

    ctx.putImageData(imageData, 0, 0);
  }, []);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    // Post-processing
    processImage(canvas);

    setCaptured(true);
    stopCamera();

    // Convert to file
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File(
          [blob],
          `scan-${Date.now()}.jpg`,
          { type: "image/jpeg" }
        );
        onCapture(file);
      },
      "image/jpeg",
      0.85
    );
  }, [processImage, stopCamera, onCapture]);

  const handleRetake = useCallback(() => {
    setCaptured(false);
    startCamera();
  }, [startCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
        <div className="text-center text-white p-6">
          <p className="mb-4">{error}</p>
          <Button variant="outline" onClick={handleClose}>
            Fermer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-black/50 absolute top-0 left-0 right-0 z-10">
        <span className="text-white text-sm font-medium">Scanner</span>
        <button
          onClick={handleClose}
          className="text-white p-1.5 rounded-full hover:bg-white/20"
          aria-label="Fermer le scanner"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Video / Canvas preview */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${captured ? "hidden" : ""}`}
        />
        <canvas
          ref={canvasRef}
          className={`max-w-full max-h-full object-contain ${captured ? "" : "hidden"}`}
        />
      </div>

      {/* Controls */}
      <div className="p-4 pb-8 bg-black/50 flex items-center justify-center gap-6 absolute bottom-0 left-0 right-0">
        {captured ? (
          <Button
            variant="outline"
            size="lg"
            onClick={handleRetake}
            className="text-white border-white/30 hover:bg-white/10"
          >
            <RotateCcw className="size-4 mr-1.5" />
            Reprendre
          </Button>
        ) : (
          <button
            onClick={handleCapture}
            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="Capturer"
          >
            <Camera className="size-6 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
