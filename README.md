# Meme Creator

AI meme/GIF/sticker/clip tool. Browse like Giphy + an AI **Create** feature.
Dark theme default with light toggle. Web app → runs on Mac & Windows in any browser.

See [BUILD_PLAN.md](BUILD_PLAN.md) for the full architecture and roadmap.

## Phase 1 (this scaffold) — Browse

- Next.js (App Router) + TypeScript + Tailwind
- Dark/light theme toggle (dark default)
- Browse tabs: **GIFs · Stickers · Memes** with search, powered by GIPHY
- Works without a key (shows placeholders); add a key for live results

## Run

```bash
npm install
cp .env.local.example .env.local   # add GIPHY_API_KEY (free)
npm run dev                        # http://localhost:3000
```

No key yet? It still runs — the browse grid shows placeholders and a banner
telling you how to add a free GIPHY key.

## Phase 2–3 — AI Create (done)

- Upload image/video (video frame auto-extracted), prompt, output-type picker
- Image gen: Pollinations FLUX (no key) → Cloudflare FLUX when key set
- Vision analysis of upload via Cloudflare (optional)
- Meme caption overlay (Impact, top/bottom) on a canvas → download PNG

## Phase 4 — Stickers + animation (done, client-side, free)

- **Transparent stickers** — `@imgly/background-removal` (loaded from CDN at
  runtime, WASM, in-browser) → die-cut PNG with alpha
- **Animated GIF** — `gifenc`, looping motion (zoom/pan/shake/bounce)
- **Clip** — canvas `MediaRecorder` → WebM
- All run in the browser: no FFmpeg install, no server, no signup

> These features use canvas / MediaRecorder / WASM — test them in a real
> browser (`npm run dev` → `/create`), not via curl.

## Next

- **Phase 5** — storage + share pages (`/result/[id]` with OG previews) + gallery
  (needs free Supabase + R2 accounts), then PWA polish & optional Tauri wrap
```
