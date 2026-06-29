"use client";

import { Download, Trash2, Loader2, ImageOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { allCreations, removeCreation, type Creation } from "@/lib/gallery";

interface Item extends Creation {
  url: string;
}

export function GalleryGrid() {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    let urls: string[] = [];
    allCreations().then((rows) => {
      const mapped = rows.map((r) => {
        const url = URL.createObjectURL(r.blob);
        urls.push(url);
        return { ...r, url };
      });
      setItems(mapped);
    });
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  async function del(id: string) {
    await removeCreation(id);
    setItems((cur) => (cur ? cur.filter((i) => i.id !== id) : cur));
  }

  function download(item: Item) {
    const a = document.createElement("a");
    a.href = item.url;
    a.download = `${item.type}-${item.id}.${item.ext}`;
    a.click();
  }

  if (items === null) {
    return (
      <div className="flex justify-center py-24 text-muted">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center text-muted">
        <ImageOff size={28} />
        <p>Nothing saved yet.</p>
        <Link
          href="/create"
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Create something
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="group overflow-hidden rounded-xl border border-border bg-surface"
        >
          <div className="relative aspect-square bg-bg">
            {item.ext === "webm" ? (
              <video
                src={item.url}
                muted
                loop
                playsInline
                onMouseOver={(e) => e.currentTarget.play()}
                onMouseOut={(e) => e.currentTarget.pause()}
                className="h-full w-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.url}
                alt={item.type}
                className="h-full w-full object-contain"
              />
            )}
            <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] uppercase text-white">
              {item.type}
            </span>
          </div>
          <div className="flex items-center justify-between p-2">
            <button
              onClick={() => download(item)}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted hover:text-fg"
            >
              <Download size={14} /> Save
            </button>
            <button
              onClick={() => del(item.id)}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted hover:text-red-400"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
