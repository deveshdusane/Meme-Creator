"use client";

import { Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { MediaItem } from "@/lib/giphy";

export function MediaGrid({ items }: { items: MediaItem[] }) {
  if (!items.length) {
    return (
      <p className="py-20 text-center text-muted">No results. Try another search.</p>
    );
  }
  return (
    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
      {items.map((item) => (
        <Card key={item.id} item={item} />
      ))}
    </div>
  );
}

function Card({ item }: { item: MediaItem }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(item.full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div className="group relative break-inside-avoid overflow-hidden rounded-xl border border-border bg-surface">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.preview}
        alt={item.title}
        loading="lazy"
        className="w-full bg-bg object-cover"
        style={{ aspectRatio: `${item.width} / ${item.height}` }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-end justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={copy}
          className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full bg-white/90 text-black hover:bg-white"
          aria-label="Copy link"
          title="Copy link"
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full bg-white/90 text-black hover:bg-white"
          aria-label="Open source"
          title="Open on GIPHY"
        >
          <ExternalLink size={15} />
        </a>
      </div>
    </div>
  );
}
