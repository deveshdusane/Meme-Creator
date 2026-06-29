"use client";

import { Search, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaItem, MediaTab } from "@/lib/giphy";
import { MediaGrid } from "./MediaGrid";

const TABS: { key: MediaTab; label: string }[] = [
  { key: "gifs", label: "GIFs" },
  { key: "stickers", label: "Stickers" },
  { key: "memes", label: "Memes" },
];

export function BrowseExplorer() {
  const [tab, setTab] = useState<MediaTab>("gifs");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mock, setMock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  async function load(activeTab: MediaTab, q: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/giphy?type=${activeTab}&q=${encodeURIComponent(q)}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setItems(json.items);
      setMock(Boolean(json.mock));
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // refetch on tab/query change (debounced for typing)
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(tab, query), query ? 350 : 0);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, query]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-full border border-border bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-brand text-white"
                  : "text-muted hover:text-fg"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${tab}…`}
            className="w-full rounded-full border border-border bg-surface py-2 pl-9 pr-3 text-sm text-fg outline-none placeholder:text-muted focus:border-brand"
          />
        </div>
      </div>

      {mock && (
        <div className="mb-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          Showing placeholders — add <code className="text-fg">GIPHY_API_KEY</code> to{" "}
          <code className="text-fg">.env.local</code> for live results.{" "}
          <a
            className="text-brand underline"
            href="https://developers.giphy.com/"
            target="_blank"
            rel="noreferrer"
          >
            Get a free key
          </a>
          .
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <MediaGrid items={items} />
      )}
    </div>
  );
}
