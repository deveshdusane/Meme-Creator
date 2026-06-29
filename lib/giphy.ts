// Server-side GIPHY client. Key stays on the server (never shipped to browser).
// Free tier: 42 searches/hr, 1000/day (beta key 100/hr). Get a key:
// https://developers.giphy.com/  →  put it in .env.local as GIPHY_API_KEY

export type MediaTab = "gifs" | "stickers" | "memes";

export interface MediaItem {
  id: string;
  title: string;
  url: string; // page url on giphy
  preview: string; // small still/animated preview
  full: string; // full-size animated
  width: number;
  height: number;
  isSticker: boolean;
}

const BASE = "https://api.giphy.com/v1";

function mapGif(g: any, isSticker: boolean): MediaItem {
  const img = g.images || {};
  const preview = img.fixed_width?.url || img.preview_gif?.url || img.original?.url;
  const full = img.original?.url || preview;
  return {
    id: g.id,
    title: g.title || "untitled",
    url: g.url,
    preview,
    full,
    width: Number(img.fixed_width?.width || img.original?.width || 200),
    height: Number(img.fixed_width?.height || img.original?.height || 200),
    isSticker,
  };
}

export async function fetchMedia(
  tab: MediaTab,
  q: string,
  limit = 30,
): Promise<{ items: MediaItem[]; mock: boolean }> {
  const key = process.env.GIPHY_API_KEY;

  // No key configured → return mock items so the UI still renders during setup.
  if (!key) {
    return { items: mockItems(tab, limit), mock: true };
  }

  // Stickers use the /stickers endpoints; gifs + memes use /gifs.
  const endpointType = tab === "stickers" ? "stickers" : "gifs";
  const isSticker = tab === "stickers";

  // "memes" has no dedicated endpoint → bias the query toward memes.
  const query = tab === "memes" ? (q ? `${q} meme` : "meme") : q;

  const params = new URLSearchParams({
    api_key: key,
    limit: String(limit),
    rating: "pg-13",
    bundle: "messaging_non_clips",
  });

  let url: string;
  if (query.trim()) {
    params.set("q", query.trim());
    url = `${BASE}/${endpointType}/search?${params}`;
  } else {
    url = `${BASE}/${endpointType}/trending?${params}`;
  }

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`GIPHY ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  const items = (json.data || []).map((g: any) => mapGif(g, isSticker));
  return { items, mock: false };
}

function mockItems(tab: MediaTab, limit: number): MediaItem[] {
  const label = tab === "stickers" ? "Sticker" : tab === "memes" ? "Meme" : "GIF";
  return Array.from({ length: limit }).map((_, i) => {
    const h = 150 + ((i * 37) % 160);
    return {
      id: `mock-${tab}-${i}`,
      title: `${label} placeholder ${i + 1}`,
      url: "https://developers.giphy.com/",
      preview: `https://placehold.co/240x${h}/14161c/8e96a3?text=${label}+${i + 1}`,
      full: `https://placehold.co/480x${h * 2}/14161c/8e96a3?text=${label}+${i + 1}`,
      width: 240,
      height: h,
      isSticker: tab === "stickers",
    };
  });
}
