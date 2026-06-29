"use client";

import { Download, Scissors, Loader2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { cutout } from "@/lib/sticker";
import { SaveButton } from "./SaveButton";

// checkerboard so transparency is visible
const CHECKER =
  "repeating-conic-gradient(rgb(var(--border)) 0% 25%, transparent 0% 50%) 50% / 20px 20px";

export function StickerResult({ imageUrl }: { imageUrl: string }) {
  const [cut, setCut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function remove() {
    setBusy(true);
    setError(null);
    setPct(0);
    try {
      const blob = await cutout(imageUrl, setPct);
      setCut(URL.createObjectURL(blob));
    } catch (e: any) {
      setError(e?.message || "Background removal failed");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    const href = cut || imageUrl;
    const a = document.createElement("a");
    a.href = href;
    a.download = `sticker-${Date.now()}.png`;
    a.click();
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
      <div
        className="overflow-hidden rounded-xl border border-border"
        style={{ background: cut ? CHECKER : undefined }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cut || imageUrl}
          alt="sticker"
          className="mx-auto block max-h-[60vh] w-auto max-w-full"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {!cut && (
          <button
            onClick={remove}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm hover:border-brand disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Removing… {pct}%
              </>
            ) : (
              <>
                <Scissors size={16} /> Remove background
              </>
            )}
          </button>
        )}
        <button
          onClick={download}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Download size={16} /> Download PNG
        </button>
        <button
          onClick={copyLink}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm hover:border-brand"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />} Copy link
        </button>
        <SaveButton
          type="sticker"
          ext="png"
          getBlob={async () => (await fetch(cut || imageUrl)).blob()}
        />
      </div>

      {cut && (
        <p className="text-xs text-muted">
          Transparent cutout ready — die-cut sticker PNG.
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
