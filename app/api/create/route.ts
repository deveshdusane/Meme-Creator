import { NextRequest, NextResponse } from "next/server";
import { generateImage, editImage } from "@/lib/ai/imagegen";
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
  const transform = Boolean(body?.transform);

  if (!prompt && !sourceImage) {
    return NextResponse.json(
      { error: "Add a prompt or upload an image." },
      { status: 400 },
    );
  }

  try {
    // Transform mode: edit the user's uploaded image per the prompt (img2img).
    if (transform && sourceImage && prompt) {
      const edit = await editImage(prompt, sourceImage);
      return NextResponse.json({
        imageUrl: edit.url,
        provider: edit.provider,
        analysis: null,
        finalPrompt: prompt,
        animated: false,
        type,
      });
    }

    // Text-to-image: build the styled prompt and generate.
    const finalPrompt = buildPrompt(type, prompt, null);
    const dims = dimsFor(type);
    const gen = await generateImage(finalPrompt, dims);

    return NextResponse.json({
      imageUrl: gen.url,
      provider: gen.provider,
      analysis: null,
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
