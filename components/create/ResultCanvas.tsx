"use client";

import { Download, Copy, Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SaveButton } from "./SaveButton";

export function ResultCanvas({
  imageUrl,
  topText,
  bottomText,
}: {
  imageUrl: string;
  topText: string;
  bottomText: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [tainted, setTainted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setReady(false);
    setTainted(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      drawMemeText(ctx, canvas.width, canvas.height, topText, bottomText);
      setReady(true);
    };
    img.onerror = () => setReady(true);
    img.src = imageUrl;
  }, [imageUrl, topText, bottomText]);

  async function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `meme-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
    } catch {
      // canvas tainted (image without CORS) → fall back to opening source
      setTainted(true);
      window.open(imageUrl, "_blank");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-border bg-bg">
        {!ready && (
          <div className="absolute inset-0 grid place-items-center text-muted">
            <Loader2 className="animate-spin" />
          </div>
        )}
        <canvas ref={canvasRef} className="mx-auto block max-h-[60vh] w-auto max-w-full" />
      </div>
      <div className="flex gap-2">
        <button
          onClick={download}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Download size={16} /> Download
        </button>
        <button
          onClick={copyLink}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm hover:border-brand"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />} Copy link
        </button>
        <SaveButton
          type="meme"
          ext="png"
          getBlob={() =>
            new Promise<Blob | null>((resolve) => {
              const canvas = canvasRef.current;
              if (!canvas) return resolve(null);
              canvas.toBlob((b) => resolve(b), "image/png");
            })
          }
        />
      </div>
      {tainted && (
        <p className="text-xs text-muted">
          Couldn&apos;t composite caption (image blocked cross-origin) — opened the
          raw image instead.
        </p>
      )}
    </div>
  );
}

function drawMemeText(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  top: string,
  bottom: string,
) {
  if (!top && !bottom) return;
  const fontSize = Math.round(w * 0.09);
  ctx.font = `bold ${fontSize}px Impact, "Arial Black", sans-serif`;
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, fontSize * 0.12);
  ctx.strokeStyle = "black";
  ctx.fillStyle = "white";

  const draw = (text: string, y: number, baseline: CanvasTextBaseline) => {
    ctx.textBaseline = baseline;
    const upper = text.toUpperCase();
    ctx.strokeText(upper, w / 2, y, w * 0.95);
    ctx.fillText(upper, w / 2, y, w * 0.95);
  };

  if (top) draw(top, fontSize * 0.4, "top");
  if (bottom) draw(bottom, h - fontSize * 0.4, "bottom");
}
