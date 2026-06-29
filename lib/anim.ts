// Client-side animation: turn a generated still into a looping GIF (gifenc) or
// a WebM clip (canvas MediaRecorder). All in-browser, free, no FFmpeg/native.

import { GIFEncoder, quantize, applyPalette } from "gifenc";

export type Motion =
  | "jump"
  | "spin"
  | "zoom"
  | "pan"
  | "shake"
  | "bounce"
  | "pulse"
  | "wobble"
  | "float"
  | "flip"
  | "tada";

export const MOTIONS: { key: Motion; label: string }[] = [
  { key: "jump", label: "Jump" },
  { key: "spin", label: "Spin" },
  { key: "flip", label: "Flip" },
  { key: "zoom", label: "Zoom" },
  { key: "pan", label: "Pan" },
  { key: "bounce", label: "Bounce" },
  { key: "float", label: "Float" },
  { key: "pulse", label: "Pulse" },
  { key: "wobble", label: "Wobble" },
  { key: "shake", label: "Shake" },
  { key: "tada", label: "Tada" },
];

// Background fill for character motions (jump). Matches the dark theme.
const STAGE_BG = "#0b0d12";

export function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image (CORS?)"));
    img.src = url;
  });
}

function coverScale(iw: number, ih: number, w: number, h: number) {
  return Math.max(w / iw, h / ih);
}

// Ping-pong so loops are seamless (0 → 1 → 0).
function pp(t: number) {
  return 1 - Math.abs(2 * t - 1);
}

// A faked jump from a single still: parabolic arc + squash/stretch + a ground
// shadow that shrinks as the character rises. Looks best on a bg-removed cutout.
function drawJump(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  t: number,
) {
  ctx.fillStyle = STAGE_BG;
  ctx.fillRect(0, 0, w, h);

  const arc = Math.sin(Math.PI * t); // 0 (ground) → 1 (peak) → 0 (ground)

  // contain-fit the character to ~58% of the stage height
  const s = (h * 0.58) / img.height;
  const cw = img.width * s;
  const ch = img.height * s;

  const floorY = h * 0.86; // where the feet rest on the ground
  const lift = h * 0.3 * arc; // how high it jumps

  // squash on the ground, stretch in the air
  const stretchY = 1 + 0.14 * arc;
  const scaleX = 1 - 0.1 * arc;
  const dw = cw * scaleX;
  const dh = ch * stretchY;

  const feetY = floorY - lift;
  const top = feetY - dh;
  const left = w / 2 - dw / 2;

  // ground shadow — smaller & fainter the higher it goes
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(
    w / 2,
    floorY,
    (cw * 0.45) * (1 - 0.45 * arc),
    (ch * 0.05) * (1 - 0.45 * arc),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();

  ctx.drawImage(img, left, top, dw, dh);
}

// Fan-style spin: full 360° rotation around the center each loop. Contain-fit so
// the figure never clips at any angle. Best on a bg-removed cutout.
function drawSpin(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  t: number,
) {
  ctx.fillStyle = STAGE_BG;
  ctx.fillRect(0, 0, w, h);

  // scale so the image's diagonal fits the stage → no clipping while rotating
  const diag = Math.hypot(img.width, img.height);
  const s = (Math.min(w, h) * 0.92) / diag;
  const dw = img.width * s;
  const dh = img.height * s;

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(t * Math.PI * 2);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  motion: Motion,
  t: number,
) {
  if (motion === "jump") {
    drawJump(ctx, img, w, h, t);
    return;
  }
  if (motion === "spin") {
    drawSpin(ctx, img, w, h, t);
    return;
  }

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  const base = coverScale(img.width, img.height, w, h);
  let scale = base;
  let dx = 0;
  let dy = 0;
  let rot = 0; // radians
  let flipX = 1; // horizontal flip factor (for turntable)
  const p = pp(t);
  const tau = Math.PI * 2;

  switch (motion) {
    case "zoom":
      scale = base * (1 + 0.18 * p);
      break;
    case "pan":
      scale = base * 1.12;
      dx = (p - 0.5) * w * 0.18;
      break;
    case "shake":
      scale = base * 1.04;
      dx = Math.sin(t * Math.PI * 8) * w * 0.02;
      dy = Math.cos(t * Math.PI * 8) * h * 0.02;
      break;
    case "bounce":
      scale = base * 1.06;
      dy = -p * h * 0.06;
      break;
    case "pulse":
      // heartbeat — two quick beats per loop
      scale = base * (1 + 0.09 * Math.abs(Math.sin(t * tau * 2)));
      break;
    case "wobble":
      scale = base * 1.02;
      rot = Math.sin(t * tau * 3) * 0.13; // ~7.5° back and forth
      break;
    case "float":
      dy = -p * h * 0.05; // gentle hover
      rot = Math.sin(t * tau) * 0.04;
      break;
    case "flip":
      // fake turntable — squash horizontally and mirror to imply turning
      flipX = Math.cos(t * tau);
      scale = base;
      break;
    case "tada":
      scale = base * (1 + 0.1 * p);
      rot = Math.sin(t * tau * 4) * 0.09;
      break;
  }

  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.save();
  ctx.translate(w / 2 + dx, h / 2 + dy);
  if (rot) ctx.rotate(rot);
  // keep a sliver of width at the edge-on point so it never fully vanishes
  ctx.scale(flipX === 0 ? 0.02 : flipX, 1);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

// yield to the browser so the encode loop never blocks the main thread
// (otherwise Chrome shows a "Page Unresponsive" dialog mid-build).
const yieldToUI = () => new Promise((r) => setTimeout(r, 0));

export async function buildGif(
  url: string,
  motion: Motion,
  opts?: { size?: number; frames?: number; delay?: number; onProgress?: (p: number) => void },
): Promise<Blob> {
  const size = opts?.size ?? 360;
  const frames = opts?.frames ?? 18;
  const delay = opts?.delay ?? 90;
  const img = await loadImg(url);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const enc = GIFEncoder();

  for (let i = 0; i < frames; i++) {
    drawFrame(ctx, img, size, size, motion, i / frames);
    const { data } = ctx.getImageData(0, 0, size, size);
    const palette = quantize(data, 128);
    const index = applyPalette(data, palette);
    enc.writeFrame(index, size, size, { palette, delay });
    opts?.onProgress?.(Math.round(((i + 1) / frames) * 100));
    await yieldToUI(); // keep the page responsive between frames
  }
  enc.finish();
  // copy into a fresh ArrayBuffer-backed view so it satisfies BlobPart
  return new Blob([new Uint8Array(enc.bytes())], { type: "image/gif" });
}

export async function buildClip(
  url: string,
  motion: Motion,
  opts?: { size?: number; duration?: number; fps?: number },
): Promise<Blob> {
  const size = opts?.size ?? 640;
  const duration = opts?.duration ?? 3;
  const fps = opts?.fps ?? 30;
  const img = await loadImg(url);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const stream = canvas.captureStream(fps);

  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    rec.onerror = () => reject(new Error("Recording failed"));
    rec.start();
    const start = performance.now();
    const loop = (now: number) => {
      const elapsed = (now - start) / 1000;
      drawFrame(ctx, img, size, size, motion, (elapsed / duration) % 1);
      if (elapsed < duration) requestAnimationFrame(loop);
      else rec.stop();
    };
    requestAnimationFrame(loop);
  });
}
