import { NextRequest, NextResponse } from "next/server";
import { analyzeImage } from "@/lib/ai/analyze";
import { generateImage } from "@/lib/ai/imagegen";
import { buildPrompt, dimsFor, type OutputType } from "@/lib/ai/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const TYPES: OutputType[] = ["meme", "sticker", "gif", "clip"];

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = String(body?.prompt || "").slice(0, 500);
  const type: OutputType = TYPES.includes(body?.type) ? body.type : "meme";
  const sourceImage: string | null =
    typeof body?.sourceImage === "string" ? body.sourceImage : null;

  if (!prompt && !sourceImage) {
    return NextResponse.json(
      { error: "Add a prompt or upload an image." },
      { status: 400 },
    );
  }

  try {
    // 1. Analyze upload (optional — null if no CF key)
    const caption = sourceImage ? await analyzeImage(sourceImage) : null;

    // 2. Build final prompt
    const finalPrompt = buildPrompt(type, prompt, caption);

    // 3. Generate
    const dims = dimsFor(type);
    const gen = await generateImage(finalPrompt, dims);

    // 4. Return (GIF/clip animation is Phase 4 — still image returned now)
    return NextResponse.json({
      imageUrl: gen.url,
      provider: gen.provider,
      analysis: caption,
      finalPrompt,
      animated: false,
      type,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Generation failed" },
      { status: 502 },
    );
  }
}
