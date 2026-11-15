# VARUNIKA — A Birthday Original

A personal, Netflix-inspired streaming site built as a birthday gift: a password-protected
collection of real photos and videos from four years at Kongu Engineering College, browsable
like a private streaming service.

This is a real, working full-stack application (React + Vite frontend, Express + TypeScript
backend) — not a mockup. It scans an actual `media/` folder on disk, serves those files only to
an authenticated session, and builds the homepage, seasons, featured collection, timeline, and
Easter eggs from that real content plus a small editable configuration file.

## Features

- Cinematic intro (synthesized Web Audio sound, no licensed/recorded assets) with a Skip Intro
  control and a "Happy Birthday Varunika" reveal.
- Real server-side password protection (Argon2id hash, `express-session`, rate limiting, CSRF
  protection) — not a frontend-only dialog.
- "Who's watching?" profile screen for Varunika (real photo if configured, monogram fallback).
- A Netflix-style homepage: hero banner, Continue Watching, the "Moments to cherish" featured
  collection, Four Years seasons, folder-derived category rows, My List, and a hidden
  "Only We Understand" collection unlocked by typing a configurable key sequence.
- Movie-detail pages, a custom video player (seek, volume, speed, fullscreen, resume, next
  episode, keyboard shortcuts, error/retry handling), and a photo gallery with a lightbox.
- Search, My List, a random "Surprise Me" memory picker, a friendship timeline, a birthday
  letter, confetti, end credits, and a click-the-logo Easter egg.
- Automated tests: Vitest + React Testing Library (frontend units), Vitest + Supertest (backend
  auth/security), and a Playwright end-to-end journey.

## Requirements

- Node.js 18.18+ and npm
- (Optional, for better thumbnails) [ffmpeg](https://ffmpeg.org/) on your `PATH`, to generate
  real video poster frames. Without it, videos fall back to a generic placeholder thumbnail.

## 1. Install

```bash
npm install
```

## 2. Configure your `.env`

```bash
cp .env.example .env
```

Generate a real passcode hash (replace `"yourSecretPasscode"` with the actual passcode you want
to give Varunika):

```bash
npm run hash-password -- "yourSecretPasscode"
```

Copy the printed `BIRTHDAY_PASSWORD_HASH=...` line into `.env`. Also set `SESSION_SECRET` to a
long random string (the command below generates one):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**If you skip this step in development**, the server will generate a temporary passcode and
print it to the console on every restart — convenient for trying the app locally, but it is
never written to disk and is not meant for the real gift.

## 3. Add the media

Your real photos/videos go in `media/` at the project root, as real folders — e.g.:

```
media/
├── Random college snap/
├── Dance/
├── Hackathon/
├── Funny/
├── Akka Marriage/
├── Moments to cherish/
├── Birthday - 2025/
├── IV Kerala/
├── Funny calls/
├── childhood/
├── Birthday - 2024/
├── Pongal/
├── inplant cbe/
├── Movie diesel/
├── Movie - Jailer2/
└── IV kodaikkanal/
```

Folder names and spacing are preserved exactly as they are on disk — nothing is renamed. The
server scans this folder itself at startup (no manual "build the manifest" step needed); if you
add or remove files, just restart the server (`npm run dev:server` / `npm start`).

Each folder becomes its own row on the homepage, labeled with a friendly display name (see
`shared/folderDisplayNames.ts` — e.g. `Random college snap` → "College Diaries"). Files are never
mixed across folders. Camera/app-generated filenames (`IMG_1234.jpg`, `VID-...-WA0036.mp4`,
`Screenshot (42).png`, ...) get a friendly generated title like "College Diaries — Memory 12"
instead of being shown verbatim; nothing specific is invented, it's just a label.

**Optional intro video**: drop a video file directly at the root of `media/` (not inside any
folder) with "intro" somewhere in its filename, e.g. `media/Netflix Intro 1080p.mp4`, and the
cinematic intro will play that real file (with its original audio) before the password screen,
instead of the built-in synthesized animation. It's excluded from every other part of the site —
never shown as a regular memory, never counted in any collection.

Supported formats: JPG/JPEG/PNG/WEBP/GIF/AVIF for photos, MP4/WEBM/MOV/M4V for videos. MOV files
with unusual codecs (e.g. HEVC) may not play in every browser — the app flags these and shows a
clear in-player error with a retry option rather than failing silently; converting such files to
MP4 (H.264/AAC) is the most reliable fix. `media/` is git-ignored — it is never meant to be
committed.

Run `npm run scan-media` any time to print a report of what was found (and any warnings) without
starting the server — this writes `server/data/media-manifest.json` for your own inspection only;
the running server always re-scans live and does not depend on this file.

Optionally pre-generate thumbnails (recommended — faster first paint, requires `ffmpeg` on `PATH`
for video posters; photos always get a real thumbnail via `sharp` either way):

```bash
npm run generate-thumbnails
```

For any video without a pre-generated poster, the browser itself grabs a real frame from that
exact video on the fly (client-side, via `<video>` + `<canvas>`, lazily as it scrolls into view)
and caches it for the session — so every video gets its own real thumbnail either way, never a
repeated generic placeholder.

## 4. Personalize the content

```bash
cp content/editorial.example.json content/editorial.json
```

Edit `content/editorial.json` (git-ignored, since it will contain personal names/dates/messages)
to set:

- The homepage hero item, the profile photo, and the "Moments to cherish" episode order.
- Season → folder assignments for "Four Years" (these are editable suggestions, not claims about
  what actually happened each year).
- The birthday letter text and sign-off.
- The Easter egg message and the hidden "Only We Understand" collection's media ids and unlock
  key sequence.
- Timeline milestones — **only shown if you add them here**; nothing is invented.
- End-credits entries.

To find a real media id to reference in that file, log in to the running app and open
`/api/media/manifest` in the browser — it lists every scanned item with its id, title, and folder.

You can also override individual files' titles/descriptions/flags without touching the scanner:

```bash
cp content/media-overrides.example.json content/media-overrides.json
```

## 5. Run it

Two processes in development — the Vite dev server (frontend, with hot reload) and the Express
API (backend):

```bash
npm run dev
```

This starts both (`dev:client` on `:5173`, `dev:server` on `:3000`) and proxies `/api/*` from the
Vite dev server to the Express server. Open **http://localhost:5173**.

## 6. Test

```bash
npm run typecheck     # TypeScript, frontend + backend
npm test              # Vitest: frontend unit tests + backend auth/security integration tests
npm run test:e2e      # Playwright: full journey against a real server + fixture media
```

The end-to-end suite uses small fixture files under `tests/e2e/fixtures/media/` — never
Varunika's real photos/videos. Those fixtures are plain placeholder bytes, not real decodable
media, so the suite verifies the video player's **error-handling UI** (a real, useful thing to
test) rather than asserting that fake bytes "played" successfully. Resume-progress rendering is
verified by seeding `localStorage` directly and checking the UI reacts correctly. If you want a
deeper check of actual playback/seeking/next-episode behavior, drop a short real MP4 into
`tests/e2e/fixtures/media/Moments to cherish/` and extend the spec.

## 7. Build for production

```bash
npm run build   # scans media, builds the frontend (dist/client), compiles the server (dist/server)
npm start        # serves the API and the built frontend from one process
```

## Deployment

This app is one Node process that serves both the API and (once built) the static frontend, so
the simplest deployment is: build it, then run `npm start` on any host that can
run a persistent Node process (e.g. a small VM, Render, Railway, Fly.io) with:

- `media/` present on that host's disk (or adapted to read from private object storage — see
  below), and
- `.env` configured with real secrets (`SESSION_SECRET`, `BIRTHDAY_PASSWORD_HASH`), plus
  `NODE_ENV=production` and `COOKIE_SECURE=true` once you're serving over HTTPS.

**Ordinary static hosting (e.g. a plain CDN/static bucket) cannot enforce the server-side
password gate** — the whole point of this project's security model is that the Express server
checks the session before it will stream a single byte of a protected file. Don't deploy the
frontend to static hosting while pointing it at an unauthenticated media URL.

If you'd rather not keep `media/` on the same disk as the app process, swap
`server/src/services/mediaScanner.ts` / `mediaManifest.ts`'s local filesystem calls for a private
object-storage SDK (e.g. S3 with signed, short-lived URLs) behind the same `requireAuth`
middleware — the route layer (`server/src/routes/media.ts`) already only ever exposes `/api/media/file/:id`
and resolves `id` server-side, so no client ever sees a real storage path either way.

For a single local-only gift (just you and Varunika on the same network, or over a tunnel like
`ngrok`/Tailscale), running `npm start` and sharing that machine's address is enough — just know
it's only reachable while that machine and process are running.

**Session store**: the default is an in-memory session store, which is fine for a single Node
process serving one or two people. If you deploy with multiple server instances/processes behind
a load balancer, switch to a shared store (e.g. `connect-redis`) so sessions survive a restart or
work across instances — the `express-session` call in `server/src/app.ts` is the only place that
needs to change.

## Known limitations

- **Thumbnails**: videos without a pre-generated (`ffmpeg`) poster get a real frame grabbed
  client-side in the browser instead — correct and unique per video, but it costs a brief
  per-video decode the first time each one scrolls into view in a given browser session (cached
  after that). Pre-generating with `ffmpeg` avoids that cost entirely. Photos always get a real
  thumbnail via `sharp`.
- **Cross-device resume**: watch progress and My List are stored in the browser's `localStorage`,
  per the project's local-development-friendly design — they do **not** sync across devices. A
  backend progress API would be a reasonable future addition if that's wanted.
- **Next-episode auto-advance** is intentionally off by default (the spec asks for this); the
  player shows a "Play Next" prompt near the end instead of auto-playing.
- **Linting**: there's no ESLint config in this pass — `npm run typecheck` and the test suites are
  the correctness gates. Adding ESLint (e.g. `typescript-eslint` + `eslint-plugin-react-hooks`) is
  a safe follow-up.
- **Playwright coverage**: see the "Test" section above — real video decode/seek/next-episode
  behavior isn't exercised because no real sample video is checked in (intentionally — this repo
  should never need to contain a stand-in for Varunika's real media).
- **Thumbnails/manifest are rebuilt by re-scanning on every server start**, not persisted/cached
  between restarts (`server/data/media-manifest.json` is written only by the standalone
  `npm run scan-media` helper, for your own inspection).

## Project structure

```
varunika-birthday/
├── content/                  # Editable personal config (gitignored except the .example files)
├── media/                    # Real photos/videos (gitignored)
├── scripts/                  # scan-media, generate-thumbnails, hash-password CLIs
├── server/src/                # Express + TypeScript backend
│   ├── app.ts                # buildApp(): all middleware/routes (testable, no app.listen)
│   ├── index.ts               # Real entrypoint: buildApp() + app.listen()
│   ├── auth/, middleware/, routes/, services/, storage/
├── shared/types.ts            # Types shared by frontend and backend
├── src/                        # React + TypeScript frontend (Vite)
│   ├── components/, context/, hooks/, data/, services/, utils/, routes/, styles/, test/
├── tests/
│   ├── server/                 # Vitest + Supertest backend integration tests
│   └── e2e/                    # Playwright end-to-end spec + fixture media
```

## Security model, in one paragraph

Nothing about Varunika's real photos/videos is ever served without a valid session: the password
is checked server-side against an Argon2id hash (never stored or shipped to the browser), login
is rate-limited, every `/api/media/*` and `/api/content/*` route requires an authenticated
session, every media id is resolved to a filesystem path only on the server (the client never
sees or sends a real path), and CSRF protection guards the state-changing auth routes. The
profile-selection screen and the hidden "Only We Understand" collection are deliberately *not*
security boundaries — they're part of the experience, sitting behind the one security boundary
that matters: the passcode.
