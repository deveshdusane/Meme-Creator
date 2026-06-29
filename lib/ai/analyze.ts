// Vision analysis of the uploaded media (image or extracted video frame).
// Uses Cloudflare Workers AI (Llama 3.2 Vision) when configured. Free tier.
// Returns null when no key is set or on any error — the pipeline then falls
// back to using the user's prompt alone (still fully functional).

const VISION_PROMPT =
  "Describe this image in one short sentence focused on the main subject, " +
  "expression, and mood. Keep it concise for use as a meme generation hint.";

export async function analyzeImage(dataUrl: string): Promise<string | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_AI_TOKEN;
  if (!accountId || !token) return null;

  try {
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const bytes = Array.from(Buffer.from(base64, "base64"));

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: VISION_PROMPT, image: bytes, max_tokens: 80 }),
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const text: string | undefined = json?.result?.response;
    return text ? text.trim() : null;
  } catch {
    return null;
  }
}
