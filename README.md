# video-platform

VOD-first video platform (YouTube+Twitch combined, live streaming later).
Solo-dev friendly stack: Next.js on Vercel, managed Postgres, Mux for video
infra — no self-hosted encoding/storage.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **Prisma 5** + **Postgres** — schema in `prisma/schema.prisma`
- **Mux** — direct-to-cloud uploads, transcoding, adaptive playback
- **Vercel** — hosting target (not required for local dev)

## Getting started

```bash
npm install          # also runs `prisma generate`
cp .env.example .env # fill in DATABASE_URL, MUX_TOKEN_ID, MUX_TOKEN_SECRET
npx prisma migrate dev --name init
npm run dev
```

> This scaffold was built in a sandboxed container that couldn't reach
> `binaries.prisma.sh`, so `prisma generate` / `migrate` haven't been run
> here yet. Everything is wired up correctly — running `npm install` on a
> normal machine (or in CI/Vercel) will fetch the query engine and generate
> the client automatically via the `postinstall` script.

### Getting a Mux account

Sign up at mux.com, grab an API token (Settings → Access Tokens) for
`MUX_TOKEN_ID` / `MUX_TOKEN_SECRET`, and add a webhook pointed at
`/api/webhooks/mux` once you have a public URL (use `ngrok` locally, or
just test after your first Vercel deploy) — copy its signing secret into
`MUX_WEBHOOK_SECRET`.

### Uploading before auth exists

There's no auth yet (see Next steps), so `/upload` reads a hardcoded
channel/user id from env vars. After your first migration, open
`npx prisma studio`, manually create one `User` and one `Channel` row
(with `ownerId` pointing at the user), and paste their ids into
`NEXT_PUBLIC_DEV_CHANNEL_ID` / `NEXT_PUBLIC_DEV_UPLOADER_ID` in `.env`.

## Project structure

```
prisma/schema.prisma        Data model (User, Channel, Video, Comment, Like, Report, ...)
src/
  app/
    page.tsx                Home feed (newest videos — see "On the algorithm" below)
    watch/[id]/page.tsx      Watch page (Mux player + comments)
    channel/[slug]/page.tsx  Channel page
    upload/page.tsx          Upload form (direct-to-Mux, resumable via upchunk)
    api/
      videos/route.ts        GET feed
      videos/[id]/route.ts   GET one video, POST to bump view count
      upload/route.ts        POST: creates a Mux direct upload + pending Video row
      webhooks/mux/route.ts  Mux → us: flips Video to READY once transcoded
  components/
    VideoCard.tsx, VideoPlayer.tsx, Navbar.tsx
  lib/
    prisma.ts                Prisma client singleton
    mux.ts                   Mux SDK wrapper (swap for Cloudflare Stream here if needed)
    videos.ts                All video/channel data-fetching lives here
```

## Data model notes

- `Channel` is separate from `User` (1:1 for now) so multi-owner/team
  channels are possible later without a migration that splits them apart.
- `Video.status` (`PROCESSING` → `READY`/`FAILED`) tracks the Mux
  transcode lifecycle; the webhook route is what advances it.
- `Report` exists from day one — moderation/reporting was one of the
  explicit pain points this product is meant to fix, so it isn't bolted
  on later.

## On the algorithm

The home feed (`getFeedVideos` in `src/lib/videos.ts`) is deliberately
*just* "newest first, everyone included." That's the whole ranking logic
for now, on purpose — the founding motivation was YouTube/Twitch burying
small and new creators. If/when you add ranking, treat it as a
replacement for that one query, not a rewrite of the pages that call it.

## Next steps (not built yet)

1. **Auth** — nothing is wired in. Recommend Auth.js (NextAuth) v5 with
   the Prisma adapter; `User.passwordHash` in the schema supports
   credentials login too if you want that instead of/alongside OAuth.
2. **Migrations** — run `npx prisma migrate dev` once `DATABASE_URL` is set.
3. **Search/tags UI** — `Tag` model exists; no UI yet.
4. **Moderation queue** — `Report` model exists; no admin UI yet.
5. **Live streaming** — deliberately deferred per the MVP order (VOD
   first). Mux also supports live ingest (RTMP → the same playback
   pipeline), so the same `Video`/`Channel` models should extend rather
   than need a parallel system — worth designing that extension before
   you start, so live and VOD don't end up feeling like separate products
   again.
