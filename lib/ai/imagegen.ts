// Free image generation.
// Default: Pollinations.ai (no key, no signup) — returns a direct image URL.
// Optional upgrade: Cloudflare Workers AI FLUX.1 Schnell (free tier) when
// CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_TOKEN are set — returns a data URL.

export interface GenResult {
  url: string;
  provider: "cloudflare-flux" | "pollinations-flux";
}

export async function generateImage(
  prompt: string,
  opts?: { width?: number; height?: number; seed?: number },
): Promise<GenResult> {
  const width = opts?.width ?? 1024;
  const height = opts?.height ?? 1024;
  const seed = opts?.seed ?? Math.floor(Math.random() * 1_000_000_000);

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_AI_TOKEN;

  if (accountId && token) {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt, steps: 4 }),
        },
      );
      if (res.ok) {
        const json = await res.json();
        const b64 = json?.result?.image;
        if (b64) {
          return { url: `data:image/jpeg;base64,${b64}`, provider: "cloudflare-flux" };
        }
      }
      // non-OK or unexpected body → fall through to Pollinations
    } catch {
      // network error → fall through to Pollinations
    }
  }

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt,
  )}?width=${width}&height=${height}&nologo=true&model=flux&seed=${seed}`;
  return { url, provider: "pollinations-flux" };
}
