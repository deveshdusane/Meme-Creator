"use client";

import { Download, Loader2, Film, Clapperboard, Copy, Check } from "lucide-react";
import { useState } from "react";
import { buildGif, buildClip, MOTIONS, type Motion } from "@/lib/anim";
import { cutout } from "@/lib/sticker";
import { SaveButton } from "./SaveButton";

export function AnimResult({
  imageUrl,
  kind,
}: {
  imageUrl: string;
  kind: "gif" | "clip";
}) {
  const [motion, setMotion] = useState<Motion>("jump");
  const [removeBg, setRemoveBg] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [pct, setPct] = useState(0);
  const [out, setOut] = useState<string | null>(null);
  const [outBlob, setOutBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const ext = kind === "gif" ? "gif" : "webm";

  async function make() {
    setBusy(true);
    setError(null);
    setWarn(null);
    setOut(null);
    setPct(0);
    try {
      // optionally cut out the background first (best for Jump).
      // If it fails (model/CDN issue), don't block — animate the original image.
      let src = imageUrl;
      if (removeBg) {
        setStage("Removing background…");
        try {
          const blob = await cutout(imageUrl);
          src = URL.createObjectURL(blob);
        } catch {
          setWarn(
            "Background removal unavailable — animated your original image instead.",
          );
        }
      }
      setStage(kind === "gif" ? "Encoding GIF…" : "Recording clip…");
      const blob =
        kind === "gif"
          ? await buildGif(src, motion, { onProgress: setPct })
          : await buildClip(src, motion);
      setOutBlob(blob);
      setOut(URL.createObjectURL(blob));
    } catch (e: any) {
      setError(e?.message || "Animation failed");
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  function download() {
    if (!out) return;
    const a = document.createElement("a");
    a.href = out;
    a.download = `${kind}-${Date.now()}.${ext}`;
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
      <div className="overflow-hidden rounded-xl border border-border bg-bg">
        {out ? (
          kind === "gif" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={out} alt="animated gif" className="mx-auto block max-h-[55vh]" />
          ) : (
            <video
              src={out}
              autoPlay
              loop
              muted
              playsInline
              className="mx-auto block max-h-[55vh]"
            />
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="still" className="mx-auto block max-h-[55vh]" />
        )}
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">Motion</div>
        <div className="flex flex-wrap gap-2">
          {MOTIONS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMotion(m.key)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                motion === m.key
                  ? "border-brand bg-brand/10 text-fg"
                  : "border-border bg-surface text-muted hover:border-brand"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {motion === "jump" && (
          <p className="mt-2 text-xs text-muted">
            Jump fakes a hop from your still (arc + squash &amp; shadow). Keep
            “Remove background” on for a clean character.
          </p>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={removeBg}
          onChange={(e) => setRemoveBg(e.target.checked)}
          className="h-4 w-4 accent-[rgb(var(--brand))]"
        />
        Remove background first
        <span className="text-xs text-muted">(recommended for Jump)</span>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={make}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {stage || "Building…"}
              {kind === "gif" && stage.startsWith("Encoding") ? ` ${pct}%` : ""}
            </>
          ) : (
            <>
              {kind === "gif" ? <Film size={16} /> : <Clapperboard size={16} />}
              {out ? "Rebuild" : `Make ${kind === "gif" ? "GIF" : "clip"}`}
            </>
          )}
        </button>
        {out && (
          <button
            onClick={download}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm hover:border-brand"
          >
            <Download size={16} /> Download .{ext}
          </button>
        )}
        {out && outBlob && (
          <SaveButton type={kind} ext={ext} getBlob={async () => outBlob} />
        )}
        <button
          onClick={copyLink}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm hover:border-brand"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />} Copy link
        </button>
      </div>

      {kind === "clip" && (
        <p className="text-xs text-muted">
          Clip exports as WebM (shareable, plays in browsers & most apps).
        </p>
      )}
      {warn && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
          {warn}
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
