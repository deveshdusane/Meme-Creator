// Transparent sticker cutout via @imgly/background-removal.
// Runs fully in the browser (WASM); model assets fetched from CDN on first use.
// Free, no key, no signup.
//
// Loaded from a CDN at RUNTIME with `webpackIgnore` so the bundler never tries
// to parse its onnxruntime-web dependency (which uses import.meta / WASM and
// breaks Next's webpack build). This keeps it 100% client-side and out of the
// build graph entirely.

// esm.sh resolves the package's bare imports (e.g. "onnxruntime-web") to full
// URLs so native browser dynamic import works. (jsdelivr's raw .mjs leaves them
// bare → "Failed to resolve module specifier 'onnxruntime-web'".)
const CDN = "https://esm.sh/@imgly/background-removal@1.7.0";

type RemoveBg = (
  src: string,
  config?: any,
) => Promise<Blob>;

let cached: RemoveBg | null = null;

async function loadRemover(): Promise<RemoveBg> {
  if (cached) return cached;
  const mod = await import(/* webpackIgnore: true */ CDN);
  cached = mod.removeBackground as RemoveBg;
  return cached;
}

export async function cutout(
  src: string,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const removeBackground = await loadRemover();
  return removeBackground(src, {
    output: { format: "image/png" },
    progress: (_key: string, current: number, total: number) => {
      if (onProgress && total) onProgress(Math.round((current / total) * 100));
    },
  });
}
