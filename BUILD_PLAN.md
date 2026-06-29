# Meme Creator — Build Plan ($0-cost AI stack)

> AI meme/GIF/sticker/clip tool. Browse like Giphy + an AI **Create** feature
> (upload image/video + prompt → AI analyzes media → generates shareable
> meme in any form: meme image, sticker, GIF, or clip).
> Dark theme default, light toggle. Runs Mac + Windows (web app = any browser).
> **Constraint: every AI piece runs on a free tier / open-source. Target $0 to operate at small scale.**

---

## 1. Decisions (locked)

| Decision | Choice | Reason |
|---|---|---|
| Web app vs desktop | **Web app (PWA)** | Memes are share-first (share = URL). Cross-platform free. AI is cloud regardless. Optional Tauri wrap later. |
| Browse source | **GIPHY API** (free tier) | Tenor API deprecated 2026-01-13, full shutdown 2026-06-30. GIPHY = only viable GIF/sticker source. |
| AI image / sticker | **Cloudflare Workers AI (FLUX.1 Schnell)** + **Pollinations.ai** fallback | Free: ~230 imgs/day on CF free neurons; Pollinations = no-key unlimited-ish fallback. |
| Media analysis (vision) | **Cloudflare Workers AI — Llama 3.2 Vision / LLaVA** | Free, same provider as image gen. Captions the upload → builds the gen prompt. |
| AI video / clip | **Image-sequence animation via FFmpeg** (primary, free) + optional self-host AnimateDiff (if a GPU is available) | No good free *hosted* text-to-video API exists. Generate keyframes free → FFmpeg motion (pan/zoom, interpolation) → MP4/GIF. |
| Sticker cutout | **rembg** (open-source, runs on server CPU) | Free transparent PNG/WebP. |
| Caption / compose | **FFmpeg** + **Satori/node-canvas** | Free text overlay, meme top/bottom captions, render. |

---

## 2. Free-tier budget (must stay inside these)

| Service | Free allowance | Used for |
|---|---|---|
| Cloudflare Workers AI | ~10k neurons/day (≈230 FLUX images/day) + vision calls | Image gen + media analysis |
| Pollinations.ai | No key, rate-limited but generous | Image gen overflow / fallback |
| GIPHY API | 42 searches/hr, 1000/day (beta key 100/hr; apply for prod) | Browse tabs |
| Vercel (Hobby) | Free hosting, serverless functions | Frontend + light API |
| Cloudflare Workers | 100k requests/day free | AI proxy + FFmpeg-light edge jobs |
| Supabase (Free) | 500MB Postgres + Auth + 1GB storage | Users, gallery, share links |
| Cloudflare R2 | 10GB storage, 0 egress fees | Generated media files |

> ⚠️ **Honest limits:** free tiers rate-limit. Heavy video gen will blow past CPU/time
> budgets on serverless — keep clips short (≤6s), low-res, queue them. If usage grows,
> only the AI-gen step needs paid GPU later; everything else stays free.

---

## 3. Architecture

```
Browser (Next.js PWA, dark/light)
   │
   ├── Browse tabs ──────────────► GIPHY API (search/trending: GIF, Sticker, Meme)
   │
   └── Create flow
         │ upload image/video + prompt + output-type
         ▼
   API layer (Next.js routes / Cloudflare Worker)
         │
         ├─ 1. Analyze media ──► CF Workers AI (Llama 3.2 Vision) → caption/tags
         ├─ 2. Build prompt ───► merge user prompt + media caption
         ├─ 3. Generate:
         │      • meme img / sticker base ► CF Workers AI FLUX  (fallback Pollinations)
         │      • sticker cutout ─────────► rembg (transparent)
         │      • GIF / clip ─────────────► keyframes → FFmpeg motion → MP4/GIF
         ├─ 4. Compose caption ──────────► FFmpeg / Satori overlay
         └─ 5. Store + share ────────────► R2 (file) + Supabase (record) → share URL
```

Async jobs: generation can take seconds → use a **job queue + status polling**
(`POST /create` returns `jobId`; client polls `GET /jobs/:id`). Keeps UI responsive.

---

## 4. Tech stack

```
Frontend   Next.js (App Router) + TypeScript
           Tailwind CSS + shadcn/ui        → theme toggle (dark default / light)
           PWA (next-pwa)                  → installable, app feel, share-target
           Zustand                         → light client state (active tab, theme, job status)

Backend    Next.js API routes (Vercel)     → orchestration, GIPHY proxy
           Cloudflare Worker               → AI calls (keeps keys server-side), edge cache
           FFmpeg (fluent-ffmpeg)          → GIF encode, clip render, caption overlay
           rembg (python microservice OR wasm) → sticker background removal

AI         Cloudflare Workers AI           → FLUX.1 Schnell (image), Llama 3.2 Vision (analyze)
           Pollinations.ai                 → free image fallback
           (optional) self-host AnimateDiff → real text-to-video if GPU available

Data       Supabase (Postgres + Auth)
Storage    Cloudflare R2
Deploy     Vercel (frontend/API) + Cloudflare (AI worker)
```

Theme: Tailwind `darkMode: 'class'`, default `dark`, toggle persists to `localStorage`.

---

## 5. File structure

```
meme-creator/
├─ app/
│  ├─ layout.tsx                # theme provider, nav
│  ├─ page.tsx                  # browse home (GIFs/Stickers/Memes tabs)
│  ├─ create/page.tsx           # AI Create: upload + prompt + output picker
│  ├─ result/[id]/page.tsx      # shareable meme page (OG meta for link previews)
│  ├─ gallery/page.tsx          # user's generated items
│  └─ api/
│     ├─ giphy/route.ts         # proxy GIPHY search/trending (hides key, branding)
│     ├─ create/route.ts        # start generation job → jobId
│     ├─ jobs/[id]/route.ts     # poll job status/result
│     └─ media/route.ts         # signed upload to R2
├─ lib/
│  ├─ ai/analyze.ts             # vision: media → caption/tags
│  ├─ ai/imagegen.ts            # FLUX (CF) with Pollinations fallback
│  ├─ ai/videogen.ts            # keyframes → FFmpeg motion → clip/GIF
│  ├─ ai/sticker.ts             # imagegen + rembg cutout
│  ├─ compose/caption.ts        # FFmpeg/Satori text overlay
│  └─ giphy.ts                  # GIPHY client
├─ components/
│  ├─ ThemeToggle.tsx
│  ├─ MediaGrid.tsx             # browse grid (masonry)
│  ├─ Uploader.tsx              # drag/drop image or video
│  ├─ OutputTypePicker.tsx      # Meme | Sticker | GIF | Clip
│  ├─ PromptBox.tsx
│  └─ ShareBar.tsx              # copy link, download, social share
├─ public/ (PWA manifest, icons)
└─ BUILD_PLAN.md
```

---

## 6. Data model (Supabase)

```sql
users        (id, email, created_at)                       -- Supabase Auth
creations    (id, user_id, type, prompt, source_media_url,
              output_url, thumb_url, caption, status,       -- status: queued|processing|done|error
              public, created_at)
jobs         (id, creation_id, stage, progress, error)
```

Share URL = `/result/:creation_id`. Page renders Open Graph tags so the meme
previews when pasted into chat/social.

---

## 7. AI Create pipeline (the differentiator)

Input: `{ media (image|video), prompt, outputType: meme|sticker|gif|clip }`

1. **Analyze** — send media to CF Llama 3.2 Vision → `{caption, subjects, mood}`.
   (For video: sample 1–3 frames, caption those.)
2. **Prompt build** — `finalPrompt = template(outputType, userPrompt, caption)`.
3. **Generate by type:**
   - `meme`   → FLUX image from finalPrompt → caption overlay (top/bottom text).
   - `sticker`→ FLUX image → rembg cutout → transparent WebP, die-cut border.
   - `gif`    → 2–4 FLUX keyframes OR animate 1 image → FFmpeg loop → GIF.
   - `clip`   → keyframes → FFmpeg Ken-Burns + interpolation → MP4 (≤6s) (+audio later).
4. **Compose** — apply caption/branding, export final.
5. **Store** — upload to R2, write `creations` row, return share URL + downloads.

Output formats: PNG/WebP (meme/sticker), GIF, MP4 (clip).

---

## 8. Cross-platform

Web app → runs in any browser on **Mac, Windows, Linux, mobile**. No OS build,
no installer, no signing. FFmpeg + AI run server-side; client just needs a browser.
PWA = installable app icon on both OSes. Optional **Tauri** wrap later (3MB, native
webview, also targets iOS/Android) reuses the same web code — phase 5 only.

---

## 9. Build phases

1. **Shell** — Next.js + Tailwind + shadcn, dark/light toggle, nav, 3 browse tabs wired to GIPHY proxy. *(Ship a working Giphy-clone.)*
2. **Create UI** — `/create`: uploader, prompt box, output-type picker, job-status UI.
3. **AI pipeline** — analyze → imagegen (FLUX + Pollinations fallback) → caption overlay. Memes + stickers (rembg) first.
4. **Motion** — FFmpeg GIF/clip path; R2 storage; share pages with OG meta; gallery + auth.
5. **Polish** — PWA, rate-limit handling/queue, optional Tauri wrap, optional self-host AnimateDiff for real video.

---

## 10. Risks / honest gotchas

- **Free video gen is weak.** True hosted text-to-video has no good free tier. Primary path = image keyframes + FFmpeg motion (free, decent for memes). Real AI video needs a GPU (self-host AnimateDiff) or paid API later.
- **Free-tier rate limits.** CF neurons (~230 img/day), GIPHY 1000/day, serverless CPU/time caps. Queue jobs, cache, keep clips short/low-res.
- **Serverless + FFmpeg** can exceed function time limits → run FFmpeg in a CF Worker / separate worker, not in a Vercel edge function.
- **GIPHY branding** attribution is required by their terms.
- **Content moderation** — AI gen of user uploads needs a basic safety filter before public share.
```
