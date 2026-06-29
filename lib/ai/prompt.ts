// Builds the final image-gen prompt from output type + user prompt + (optional)
// vision caption of the uploaded media.

export type OutputType = "meme" | "sticker" | "gif" | "clip";

type Builder = (userPrompt: string, caption: string | null) => string;

const ctx = (c: string | null) => (c ? `, based on: ${c}` : "");

const TEMPLATES: Record<OutputType, Builder> = {
  meme: (p, c) =>
    `${p}${ctx(c)}. Internet meme style, bold, funny, high contrast, clear subject, sharp focus`,
  sticker: (p, c) =>
    `${p}${ctx(c)}. Die-cut sticker, thick white border, vibrant flat illustration, simple clean background, centered`,
  gif: (p, c) =>
    `${p}${ctx(c)}. Expressive reaction meme, dynamic pose, exaggerated emotion, vivid colors`,
  clip: (p, c) =>
    `${p}${ctx(c)}. Cinematic meme scene, dramatic lighting, single strong subject`,
};

export function buildPrompt(
  type: OutputType,
  userPrompt: string,
  caption: string | null,
): string {
  const builder = TEMPLATES[type] ?? TEMPLATES.meme;
  return builder(userPrompt.trim() || "a funny meme", caption);
}

export function dimsFor(type: OutputType): { width: number; height: number } {
  if (type === "sticker") return { width: 768, height: 768 };
  return { width: 1024, height: 1024 };
}
