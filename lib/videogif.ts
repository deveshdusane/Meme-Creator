// Video → GIF using the video's REAL frames (genuine motion). Fully in-browser:
// seek the <video> across the trimmed range, draw each frame to a canvas, and
// encode with gifenc. Free, no FFmpeg, no server.

import { GIFEncoder, quantize, applyPalette } from "gifenc";

const yieldToUI = () => new Promise((r) => setTimeout(r, 0));

export interface VideoGifOptions {
  start: number; // seconds
  end: number; // seconds
  fps?: number; // target frames per second (capped)
  size?: number; // square output px
  top?: string;
  bottom?: string;
  onProgress?: (pct: number) => void;
}

const MAX_FRAMES = 60; // keep file size / encode time sane

export function loadVideo(file: File): Promise<{ video: HTMLVideoElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadedmetadata = () => resolve({ video, url });
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this video file."));
    };
  });
}

function seek(v: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      v.removeEventListener("seeked", onSeeked);
      resolve();
    };
    v.addEventListener("seeked", onSeeked);
    v.currentTime = time;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  v: HTMLVideoElement,
  size: number,
) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  const scale = Math.max(size / v.videoWidth, size / v.videoHeight);
  const dw = v.videoWidth * scale;
  const dh = v.videoHeight * scale;
  ctx.drawImage(v, (size - dw) / 2, (size - dh) / 2, dw, dh);
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  size: number,
  top?: string,
  bottom?: string,
) {
  if (!top && !bottom) return;
  const fontSize = Math.round(size * 0.1);
  ctx.font = `bold ${fontSize}px Impact, "Arial Black", sans-serif`;
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, fontSize * 0.14);
  ctx.strokeStyle = "black";
  ctx.fillStyle = "white";
  const draw = (text: string, y: number, baseline: CanvasTextBaseline) => {
    ctx.textBaseline = baseline;
    const upper = text.toUpperCase();
    ctx.strokeText(upper, size / 2, y, size * 0.95);
    ctx.fillText(upper, size / 2, y, size * 0.95);
  };
  if (top) draw(top, fontSize * 0.4, "top");
  if (bottom) draw(bottom, size - fontSize * 0.4, "bottom");
}

export async function videoToGif(
  file: File,
  opts: VideoGifOptions,
): Promise<Blob> {
  const { video, url } = await loadVideo(file);
  try {
    const size = opts.size ?? 360;
    const fps = opts.fps ?? 12;
    const start = Math.max(0, opts.start);
    const end = Math.min(video.duration || opts.end, opts.end);
    const dur = Math.max(0.2, end - start);

    const frames = Math.min(MAX_FRAMES, Math.max(2, Math.round(dur * fps)));
    const delay = Math.round((dur * 1000) / frames); // real-time playback

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const enc = GIFEncoder();

    for (let i = 0; i < frames; i++) {
      await seek(video, start + (dur * i) / frames);
      drawCover(ctx, video, size);
      drawCaption(ctx, size, opts.top, opts.bottom);
      const { data } = ctx.getImageData(0, 0, size, size);
      const palette = quantize(data, 128);
      const index = applyPalette(data, palette);
      enc.writeFrame(index, size, size, { palette, delay });
      opts.onProgress?.(Math.round(((i + 1) / frames) * 100));
      await yieldToUI();
    }
    enc.finish();
    return new Blob([new Uint8Array(enc.bytes())], { type: "image/gif" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
