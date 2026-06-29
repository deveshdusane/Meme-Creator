// Client-side media helpers: turn an uploaded image or video into a small
// JPEG data URL (used for preview + sent to vision analysis). Downscaling keeps
// the upload payload light and the vision call cheap.

const MAX_DIM = 768;

function scaleTo(w: number, h: number) {
  const ratio = Math.min(1, MAX_DIM / Math.max(w, h));
  return { w: Math.round(w * ratio), h: Math.round(h * ratio) };
}

export async function fileToPreview(
  file: File,
): Promise<{ dataUrl: string; kind: "image" | "video" }> {
  if (file.type.startsWith("video/")) {
    const dataUrl = await videoFrame(file);
    return { dataUrl, kind: "video" };
  }
  const dataUrl = await imageDownscaled(file);
  return { dataUrl, kind: "image" };
}

function imageDownscaled(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const { w, h } = scaleTo(img.naturalWidth, img.naturalHeight);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function videoFrame(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.onloadeddata = () => {
      // seek a touch in to avoid black first frame
      v.currentTime = Math.min(0.5, (v.duration || 1) / 2);
    };
    v.onseeked = () => {
      const { w, h } = scaleTo(v.videoWidth, v.videoHeight);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.drawImage(v, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    v.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    v.src = url;
  });
}
