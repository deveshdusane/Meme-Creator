// Free image generation via Pollinations.ai (no key, no signup).
// Text-to-image: anonymous flux. Image transform (img2img): kontext via
// gen.pollinations.ai with a POLLINATIONS_TOKEN.

export interface GenResult {
  url: string;
  provider: "pollinations-flux";
}

export async function generateImage(
  prompt: string,
  opts?: { width?: number; height?: number; seed?: number },
): Promise<GenResult> {
  const width = opts?.width ?? 1024;
  const height = opts?.height ?? 1024;
  const seed = opts?.seed ?? Math.floor(Math.random() * 1_000_000_000);

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt,
  )}?width=${width}&height=${height}&nologo=true&model=flux&seed=${seed}`;
  return { url, provider: "pollinations-flux" };
}

// ---------- image-to-image (edit the user's upload with a prompt) ----------

// Pollinations Kontext needs the source image as a public URL, so we push the
// upload to a free anonymous temp host first (auto-expires ~1 hour).
// Primary: litterbox.catbox.moe. Fallback: tmpfiles.org.
async function uploadTemp(dataUrl: string): Promise<string> {
  const comma = dataUrl.indexOf(",");
  const mime = /data:(.*?);/.exec(dataUrl)?.[1] || "image/jpeg";
  const bytes = Buffer.from(dataUrl.slice(comma + 1), "base64");
  const blob = new Blob([new Uint8Array(bytes)], { type: mime });

  // litterbox — returns the direct file URL as plain text
  try {
    const fd = new FormData();
    fd.append("reqtype", "fileupload");
    fd.append("time", "1h");
    fd.append("fileToUpload", blob, "upload.jpg");
    const res = await fetch(
      "https://litterbox.catbox.moe/resources/internals/api.php",
      { method: "POST", body: fd },
    );
    if (res.ok) {
      const url = (await res.text()).trim();
      if (url.startsWith("https://")) return url;
    }
  } catch {
    /* fall through to tmpfiles */
  }

  // tmpfiles fallback
  const fd = new FormData();
  fd.append("file", blob, "upload.jpg");
  const res = await fetch("https://tmpfiles.org/api/v1/upload", {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error("Temp upload failed");
  const json = await res.json();
  const url: string | undefined = json?.data?.url;
  if (!url) throw new Error("Temp upload failed");
  // page URL → direct-download URL
  return url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
}

export interface EditResult {
  url: string; // data URL — fetched server-side so keys never reach the client
  provider: "gemini-image" | "pollinations-kontext";
}

// Gemini 2.5 Flash Image ("nano-banana") — free daily API quota, takes the
// source image inline as base64 (no temp-host upload needed).
async function editWithGemini(
  prompt: string,
  sourceDataUrl: string,
  apiKey: string,
): Promise<EditResult> {
  const comma = sourceDataUrl.indexOf(",");
  const mime = /data:(.*?);/.exec(sourceDataUrl)?.[1] || "image/jpeg";
  const b64 = sourceDataUrl.slice(comma + 1);

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mime, data: b64 } },
            ],
          },
        ],
      }),
    },
  );
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Gemini edit failed (${res.status}): ${detail}`);
  }
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find((p: any) => p.inlineData?.data || p.inline_data?.data);
  if (!imgPart) {
    const text = parts.find((p: any) => p.text)?.text?.slice(0, 200);
    throw new Error(`Gemini returned no image${text ? `: ${text}` : ""}`);
  }
  const data = imgPart.inlineData?.data || imgPart.inline_data?.data;
  const outMime =
    imgPart.inlineData?.mimeType || imgPart.inline_data?.mime_type || "image/png";
  return { url: `data:${outMime};base64,${data}`, provider: "gemini-image" };
}

// Pollinations Kontext — needs a public URL for the source image + a token.
async function editWithKontext(
  prompt: string,
  sourceDataUrl: string,
  token: string,
  seed: number,
): Promise<EditResult> {
  const publicUrl = await uploadTemp(sourceDataUrl);
  // kontext lives on the new gen.pollinations.ai host (legacy image host 500s)
  const url =
    `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}` +
    `?model=kontext&image=${encodeURIComponent(publicUrl)}&nologo=true&seed=${seed}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    throw new Error(`Image transform failed (${res.status}): ${detail}`);
  }
  const mime = res.headers.get("content-type") || "image/jpeg";
  const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  return {
    url: `data:${mime};base64,${b64}`,
    provider: "pollinations-kontext",
  };
}

// Backend order: Gemini (free daily quota) → visitor's Pollinations key →
// site Pollinations key. Falls through on failure so a quota hit on one
// backend doesn't kill the request.
export async function editImage(
  prompt: string,
  sourceDataUrl: string,
  opts?: { seed?: number; userToken?: string },
): Promise<EditResult> {
  const seed = opts?.seed ?? Math.floor(Math.random() * 1_000_000_000);
  const gemini = process.env.GEMINI_API_KEY;
  const pollinations = opts?.userToken || process.env.POLLINATIONS_TOKEN;

  let geminiError: Error | null = null;
  if (gemini) {
    try {
      return await editWithGemini(prompt, sourceDataUrl, gemini);
    } catch (e: any) {
      geminiError = e; // quota/500 → fall through to Pollinations
    }
  }

  if (pollinations) {
    return editWithKontext(prompt, sourceDataUrl, pollinations, seed);
  }

  if (geminiError) throw geminiError;
  throw new Error(
    "Image transform needs a key: set GEMINI_API_KEY (free at aistudio.google.com) or a Pollinations key (enter.pollinations.ai).",
  );
}
