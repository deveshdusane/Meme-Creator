"use client";

import {
  Image as ImageIcon,
  Sticker,
  Film,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import type { OutputType } from "@/lib/ai/prompt";
import { Uploader } from "./Uploader";
import { ResultCanvas } from "./ResultCanvas";
import { StickerResult } from "./StickerResult";
import { AnimResult } from "./AnimResult";

// Clip (true text-to-video) needs a paid API — omitted. Free types only.
const TYPES: { key: OutputType; label: string; icon: any }[] = [
  { key: "meme", label: "Meme", icon: ImageIcon },
  { key: "sticker", label: "Sticker", icon: Sticker },
  { key: "gif", label: "GIF", icon: Film },
];

interface Result {
  imageUrl: string;
  provider: string;
  analysis: string | null;
  type: OutputType;
}

export function CreateStudio() {
  const [type, setType] = useState<OutputType>("meme");
  const [prompt, setPrompt] = useState("");
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [source, setSource] = useState<string | null>(null);
  // when an image is uploaded: use it directly as the base ("upload") or
  // ignore it and AI-generate a fresh image from the prompt ("ai").
  const [mode, setMode] = useState<"upload" | "ai">("upload");
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const animatedType = type === "gif" || type === "clip";
  const usingUpload = Boolean(source) && mode === "upload";

  function onUpload(dataUrl: string | null) {
    setSource(dataUrl);
    setMode(dataUrl ? "upload" : "ai"); // default to using the upload
  }

  async function generate() {
    if (!usingUpload && !prompt.trim()) {
      setError("Write a prompt, or upload an image to use directly.");
      return;
    }
    setStatus("processing");
    setError(null);
    setResult(null);

    // Upload + NO prompt → use the image directly as the base (no AI call).
    if (usingUpload && source && !prompt.trim()) {
      setResult({
        imageUrl: source,
        provider: "your upload",
        analysis: null,
        type,
      });
      setStatus("done");
      return;
    }

    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // upload + prompt → transform the image (img2img)
        // no upload / "ai" mode → text-to-image from the prompt
        body: JSON.stringify({
          prompt,
          type,
          sourceImage: source,
          transform: usingUpload && Boolean(prompt.trim()),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");
      setResult(json);
      setStatus("done");
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ---- Controls ---- */}
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium">Output type</label>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs transition-colors ${
                  type === t.key
                    ? "border-brand bg-brand/10 text-fg"
                    : "border-border bg-surface text-muted hover:border-brand"
                }`}
              >
                <t.icon size={20} className={type === t.key ? "text-brand" : ""} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Your image / video <span className="text-muted">(optional)</span>
          </label>
          <Uploader onChange={onUpload} />

          {source && (
            <div className="mt-2 inline-flex rounded-full border border-border bg-surface p-1 text-xs">
              <button
                onClick={() => setMode("upload")}
                className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                  mode === "upload" ? "bg-brand text-white" : "text-muted hover:text-fg"
                }`}
              >
                Use my image
              </button>
              <button
                onClick={() => setMode("ai")}
                className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                  mode === "ai" ? "bg-brand text-white" : "text-muted hover:text-fg"
                }`}
              >
                AI-generate instead
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Prompt{" "}
            {usingUpload && (
              <span className="text-muted">
                (optional — describes what to do with your image)
              </span>
            )}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder={
              usingUpload
                ? "e.g. make him ride a horse, add sunglasses… (empty = use image as-is)"
                : "e.g. a cat in a business suit looking unimpressed"
            }
            className="w-full resize-none rounded-xl border border-border bg-surface p-3 text-sm outline-none placeholder:text-muted focus:border-brand"
          />
          {usingUpload && prompt.trim() && (
            <p className="mt-1.5 text-xs text-muted">
              AI will redraw your image per this prompt (may take ~30s). Your
              image is briefly uploaded to a temp host for processing.
            </p>
          )}
        </div>

        {type === "meme" && (
          <div className="grid grid-cols-2 gap-3">
            <input
              value={topText}
              onChange={(e) => setTopText(e.target.value)}
              placeholder="Top caption"
              className="rounded-xl border border-border bg-surface p-3 text-sm outline-none placeholder:text-muted focus:border-brand"
            />
            <input
              value={bottomText}
              onChange={(e) => setBottomText(e.target.value)}
              placeholder="Bottom caption"
              className="rounded-xl border border-border bg-surface p-3 text-sm outline-none placeholder:text-muted focus:border-brand"
            />
          </div>
        )}

        {animatedType && (
          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
            {usingUpload
              ? "Animates your uploaded image in the browser — pick a motion in the result panel and export."
              : "Generates a base frame from your prompt, then animates it — pick a motion in the result panel and export."}
          </div>
        )}

        <button
          onClick={generate}
          disabled={status === "processing"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {status === "processing" ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Sparkles size={16} /> Generate
            </>
          )}
        </button>

        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>

      {/* ---- Result ---- */}
      <div className="rounded-xl2 border border-border bg-surface p-4">
        {status === "done" && result ? (
          <div className="space-y-3">
            {result.type === "sticker" ? (
              <StickerResult imageUrl={result.imageUrl} />
            ) : result.type === "gif" || result.type === "clip" ? (
              <AnimResult
                imageUrl={result.imageUrl}
                kind={result.type === "gif" ? "gif" : "clip"}
              />
            ) : (
              <ResultCanvas
                imageUrl={result.imageUrl}
                topText={topText}
                bottomText={bottomText}
              />
            )}
            <p className="text-xs text-muted">
              Generated via {result.provider}
              {result.analysis ? ` · saw: "${result.analysis}"` : ""}
            </p>
          </div>
        ) : status === "processing" ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-muted">
            <Loader2 className="animate-spin" />
            Generating your {type}…
          </div>
        ) : (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 text-center text-muted">
            <Sparkles size={26} className="text-brand" />
            Your result shows up here.
          </div>
        )}
      </div>
    </div>
  );
}
