import { NextRequest, NextResponse } from "next/server";
import { fetchMedia, type MediaTab } from "@/lib/giphy";

export const runtime = "nodejs";

const VALID: MediaTab[] = ["gifs", "stickers", "memes"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tabParam = (searchParams.get("type") || "gifs") as MediaTab;
  const tab = VALID.includes(tabParam) ? tabParam : "gifs";
  const q = searchParams.get("q") || "";
  const limit = Math.min(Number(searchParams.get("limit") || 30), 50);

  try {
    const { items, mock } = await fetchMedia(tab, q, limit);
    return NextResponse.json({ items, mock });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "GIPHY request failed", items: [] },
      { status: 502 },
    );
  }
}
