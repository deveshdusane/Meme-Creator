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
  url: string; // data URL — image is fetched server-side so the token stays secret
  provider: "pollinations-kontext";
}

export async function editImage(
  prompt: string,
  sourceDataUrl: string,
  opts?: { seed?: number; userToken?: string },
): Promise<EditResult> {
  // BYOK: a visitor-supplied key takes priority (spends their own free Pollen);
  // otherwise fall back to the site's own POLLINATIONS_TOKEN.
  const token = opts?.userToken || process.env.POLLINATIONS_TOKEN;
  if (!token) {
    throw new Error(
      "Image transform needs a free Pollinations key: register at enter.pollinations.ai (Keys → Add Key), then paste it in the “Your Pollinations key” field.",
    );
  }

  const seed = opts?.seed ?? Math.floor(Math.random() * 1_000_000_000);
  const publicUrl = await uploadTemp(sourceDataUrl);
  // kontext lives on the new gen.pollinations.ai host (legacy image host 500s)
  const url =
    `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}` +
    `?model=kontext&image=${encodeURIComponent(publicUrl)}&nologo=true&seed=${seed}`;

  // Fetch server-side with the token (never expose it in a client-facing URL).
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
