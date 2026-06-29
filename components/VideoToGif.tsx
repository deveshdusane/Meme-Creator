"use client";

import { Film, Loader2, Download, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { videoToGif } from "@/lib/videogif";
import { SaveButton } from "@/components/create/SaveButton";

export function VideoToGif() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(4);

  const [fps, setFps] = useState(12);
  const [size, setSize] = useState(360);
  const [top, setTop] = useState("");
  const [bottom, setBottom] = useState("");

  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [out, setOut] = useState<string | null>(null);
  const [outBlob, setOutBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick(f?: File) {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setError("Please choose a video file.");
      return;
    }
    setError(null);
    setOut(null);
    setFile(f);
    setSrc(URL.createObjectURL(f));
  }

  function onMeta() {
    const d = videoRef.current?.duration || 0;
    setDuration(d);
    setStart(0);
    setEnd(Math.min(d, 4));
  }

  function clear() {
    setFile(null);
    setSrc(null);
    setOut(null);
    setOutBlob(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function make() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setOut(null);
    setPct(0);
    try {
      const blob = await videoToGif(file, {
        start,
        end,
        fps,
        size,
        top,
        bottom,
        onProgress: setPct,
      });
      setOutBlob(blob);
      setOut(URL.createObjectURL(blob));
    } catch (e: any) {
      setError(e?.message || "Conversion failed");
    } finally {
      setBusy(false);
    }
  }

  const clip = Math.max(0, end - start);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* controls */}
      <div className="space-y-5">
        {!src ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pick(e.dataTransfer.files?.[0]);
            }}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-bg py-12 text-sm text-muted hover:border-brand"
          >
            <Upload size={26} className="text-brand" />
            Drop a video, or click to upload
            <span className="text-xs">MP4, WebM, MOV…</span>
          </button>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-border">
            <video
              ref={videoRef}
              src={src}
              onLoadedMetadata={onMeta}
              controls
              muted
              playsInline
              className="max-h-64 w-full bg-black object-contain"
            />
            <button
              onClick={clear}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />

        {src && duration > 0 && (
          <>
            <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Trim</span>
                <span className="text-muted">
                  {clip.toFixed(1)}s of {duration.toFixed(1)}s
                </span>
              </div>
              <label className="block text-xs text-muted">
                Start: {start.toFixed(1)}s
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={start}
                  onChange={(e) =>
                    setStart(Math.min(Number(e.target.value), end - 0.2))
                  }
                  className="w-full accent-[rgb(var(--brand))]"
                />
              </label>
              <label className="block text-xs text-muted">
                End: {end.toFixed(1)}s
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={end}
                  onChange={(e) =>
                    setEnd(Math.max(Number(e.target.value), start + 0.2))
                  }
                  className="w-full accent-[rgb(var(--brand))]"
                />
              </label>
              <p className="text-xs text-muted">
                Tip: keep it under ~6s for a small, snappy GIF.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Frame rate</span>
                <select
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-surface p-2 text-sm outline-none focus:border-brand"
                >
                  <option value={8}>8 fps (smaller)</option>
                  <option value={12}>12 fps</option>
                  <option value={15}>15 fps (smoother)</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Size</span>
                <select
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-surface p-2 text-sm outline-none focus:border-brand"
                >
                  <option value={240}>240px</option>
                  <option value={360}>360px</option>
                  <option value={480}>480px</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                value={top}
                onChange={(e) => setTop(e.target.value)}
                placeholder="Top caption"
                className="rounded-xl border border-border bg-surface p-3 text-sm outline-none placeholder:text-muted focus:border-brand"
              />
              <input
                value={bottom}
                onChange={(e) => setBottom(e.target.value)}
                placeholder="Bottom caption"
                className="rounded-xl border border-border bg-surface p-3 text-sm outline-none placeholder:text-muted focus:border-brand"
              />
            </div>

            <button
              onClick={make}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Converting… {pct}%
                </>
              ) : (
                <>
                  <Film size={16} /> Make GIF
                </>
              )}
            </button>
          </>
        )}

        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>

      {/* result */}
      <div className="rounded-xl2 border border-border bg-surface p-4">
        {out ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-border bg-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={out} alt="gif result" className="mx-auto block max-h-[60vh]" />
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={out}
                download={`video-${Date.now()}.gif`}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Download size={16} /> Download GIF
              </a>
              {outBlob && (
                <SaveButton type="gif" ext="gif" getBlob={async () => outBlob} />
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 text-center text-muted">
            <Film size={26} className="text-brand" />
            Your GIF shows up here.
          </div>
        )}
      </div>
    </div>
  );
}
