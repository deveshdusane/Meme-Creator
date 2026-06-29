"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { fileToPreview } from "@/lib/media";

export function Uploader({
  onChange,
}: {
  onChange: (dataUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  async function handleFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const { dataUrl } = await fileToPreview(file);
      setPreview(dataUrl);
      onChange(dataUrl);
    } catch {
      setPreview(null);
      onChange(null);
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (preview) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="upload preview" className="max-h-72 w-full object-contain bg-bg" />
        <button
          onClick={clear}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
          aria-label="Remove"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-sm transition-colors ${
        drag ? "border-brand bg-brand/5" : "border-border bg-bg text-muted hover:border-brand"
      }`}
    >
      <ImagePlus size={26} className="text-brand" />
      {busy ? "Reading…" : "Drop image or video, or click to upload"}
      <span className="text-xs text-muted">(optional — used as AI context)</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </button>
  );
}
