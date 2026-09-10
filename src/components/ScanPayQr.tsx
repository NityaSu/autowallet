"use client";

import { ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import jsQR from "jsqr";
import { handleFromPayQr } from "@/components/CopyHandle";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

type QrDetector = {
  detect: (
    source: CanvasImageSource,
  ) => Promise<Array<{ rawValue?: string }>>;
};

function barcodeDetector(): QrDetector | null {
  const Ctor = (
    window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => QrDetector;
    }
  ).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

function readCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { width, height } = canvas;
  if (width < 8 || height < 8) return null;
  const image = ctx.getImageData(0, 0, width, height);
  const code = jsQR(image.data, image.width, image.height, {
    inversionAttempts: "dontInvert",
  });
  return code?.data ?? null;
}

export function ScanPayQr({
  onFound,
  disabled,
  variant = "button",
}: {
  onFound: (handle: string) => void;
  disabled?: boolean;
  variant?: "button" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState("Point the camera at their wallet QR.");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const onFoundRef = useRef(onFound);
  onFoundRef.current = onFound;

  useEffect(() => {
    if (!open) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const videoEl: HTMLVideoElement = video;
    const canvasEl: HTMLCanvasElement = canvas;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let tick = 0;
    const detector = barcodeDetector();
    setHint("Point the camera at their wallet QR.");

    function stop() {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      videoEl.srcObject = null;
    }

    function accept(raw: string) {
      const handle = handleFromPayQr(raw, window.location.origin);
      if (!handle) {
        setHint((current) =>
          current.startsWith("Not an AutoWallet")
            ? current
            : "Not an AutoWallet pay code. Try their wallet card.",
        );
        return false;
      }
      stop();
      setOpen(false);
      onFoundRef.current(handle);
      return true;
    }

    async function sample() {
      if (cancelled) return;
      if (videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const w = videoEl.videoWidth;
        const h = videoEl.videoHeight;
        if (w && h) {
          canvasEl.width = w;
          canvasEl.height = h;
          const ctx = canvasEl.getContext("2d", { willReadFrequently: true });
          ctx?.drawImage(videoEl, 0, 0, w, h);
          if (detector) {
            try {
              const codes = await detector.detect(videoEl);
              const raw = codes[0]?.rawValue;
              if (raw && accept(raw)) return;
            } catch {
              // Fall through to jsQR.
            }
          }
          tick += 1;
          if (tick % 2 === 0) {
            const raw = readCanvas(canvasEl);
            if (raw && accept(raw)) return;
          }
        }
      }
      raf = requestAnimationFrame(() => void sample());
    }

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        } catch {
          if (!cancelled) {
            setHint("Camera blocked. Use a photo of their QR instead.");
          }
          return;
        }
      }
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      videoEl.srcObject = stream;
      await videoEl.play().catch(() => {});
      raf = requestAnimationFrame(() => void sample());
    })();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      stop();
    };
  }, [open]);

  async function onPhoto(file: File) {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) {
      setHint("Could not read that image.");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx?.drawImage(bitmap, 0, 0);
    bitmap.close();
    const detector = barcodeDetector();
    if (detector) {
      try {
        const codes = await detector.detect(canvas);
        const handle = handleFromPayQr(
          codes[0]?.rawValue ?? "",
          window.location.origin,
        );
        if (handle) {
          setOpen(false);
          onFoundRef.current(handle);
          return;
        }
      } catch {
        // jsQR below.
      }
    }
    const raw = readCanvas(canvas);
    const handle = handleFromPayQr(raw ?? "", window.location.origin);
    if (handle) {
      setOpen(false);
      onFoundRef.current(handle);
      return;
    }
    setHint("No AutoWallet pay code in that photo.");
  }

  const overlay =
    open && typeof document !== "undefined" ? (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-[#1c1612]/70 p-4"
        role="dialog"
        aria-label="Scan pay QR"
        onClick={() => setOpen(false)}
      >
        <div
          className="w-full max-w-md overflow-hidden rounded-2xl bg-[#1c1612] shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative aspect-[3/4] bg-black">
            <video
              ref={videoRef}
              className="size-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-white/80" />
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="px-4 py-3">
            <p className="m-0 text-[13px] text-white/80">{hint}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={cx(tw.btn, "bg-white")}
                onClick={() => photoRef.current?.click()}
              >
                Use photo
              </button>
              <button
                type="button"
                className={cx(tw.btn, "border-white/20 bg-transparent text-white")}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onPhoto(file);
            }}
          />
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        type="button"
        className={
          variant === "icon"
            ? "grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border-0 bg-background text-foreground disabled:cursor-not-allowed disabled:opacity-55"
            : tw.btn
        }
        disabled={disabled}
        aria-label="Scan pay QR"
        onClick={() => setOpen(true)}
      >
        <ScanLine size={variant === "icon" ? 18 : 16} />
        {variant === "button" ? "Scan" : null}
      </button>
      {overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
