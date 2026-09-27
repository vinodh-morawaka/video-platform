# video-platform

VOD-first video platform (YouTube+Twitch combined, live streaming later).
Solo-dev friendly stack: Next.js on Vercel, managed Postgres, Mux for video
infra — no self-hosted encoding/storage.

**Live:** https://video-platform-kappa-nine.vercel.app

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **Prisma 5** + **Postgres** (Neon) — schema in `prisma/schema.prisma`
- **Auth.js (NextAuth v5)** — email/password (Credentials provider), JWT sessions
- **Mux** — direct-to-cloud uploads, transcoding, adaptive playback
- **Vercel** — hosting; `prisma migrate deploy` runs automatically on every build (see `package.json`)

## Getting started

```bash
npm install          # also runs `prisma generate`
cp .env.example .env # fill in DATABASE_URL, DIRECT_URL, MUX_*, AUTH_SECRET
npx prisma migrate dev --name init
npm run dev
```

### Getting a Mux account

Sign up at mux.com, grab an API token (Settings → Access Tokens) for
`MUX_TOKEN_ID` / `MUX_TOKEN_SECRET`, and add a webhook pointed at
`/api/webhooks/mux` once you have a public URL (use `ngrok` locally, or
just use your Vercel URL) — copy its signing secret into
`MUX_WEBHOOK_SECRET`.

### Neon / Vercel Postgres connection strings

Use the **pooled** connection string for `DATABASE_URL` (hostname
contains `-pooler`, with `&pgbouncer=true` appended) and the
**unpooled** one for `DIRECT_URL`. Prisma's dev server and Vercel's
serverless functions both open many short-lived connections, which
Neon's free tier will otherwise close under you — see the `directUrl`
comment in `prisma/schema.prisma`.

### Uploading

Sign up at `/signup`, log in at `/login`, then go to `/upload` — every
account gets its own `Channel` automatically at sign-up. The upload API
route derives who's uploading from your session; there's no hardcoded
dev-user workaround.

## Project structure

```
prisma/schema.prisma        Data model (User, Channel, Video, Comment, Like, Report, ...)
src/
  app/
    page.tsx                Home feed (newest videos — see "On the algorithm" below)
    watch/[id]/page.tsx      Watch page (Mux player, comments, report buttons)
    channel/[slug]/page.tsx  Channel page
    upload/page.tsx          Server wrapper: redirects to /login if signed out
    login/page.tsx           Login form (NextAuth Credentials sign-in)
    signup/page.tsx          Sign-up form (posts to /api/auth/register)
    admin/moderation/page.tsx  Moderation queue (ADMIN/MODERATOR only)
    api/
      auth/[...nextauth]/route.ts  NextAuth's own handler (session, sign-in, sign-out)
      auth/register/route.ts       Custom sign-up: hashes password, creates User + Channel
      videos/route.ts              GET feed
      videos/[id]/route.ts         GET one video, POST to bump view count
      videos/[id]/comments/route.ts POST a comment or reply
      upload/route.ts              POST: creates a Mux direct upload + pending Video row
                                    (uploader/channel come from the session, not the client)
      webhooks/mux/route.ts        Mux → us: flips Video to READY once transcoded
      reports/route.ts             POST: file a report against a video or comment
      admin/reports/[id]/route.ts  POST: resolve a report (hide content, or dismiss)
  components/
    VideoCard.tsx, VideoPlayer.tsx, Navbar.tsx, UploadForm.tsx, SignOutButton.tsx
    CommentForm.tsx, CommentsSection.tsx    Comment posting + replies
    ReportButton.tsx, ModerationQueue.tsx   Reporting + the admin queue UI
  lib/
    prisma.ts                Prisma client singleton
    mux.ts                   Mux SDK wrapper (swap for Cloudflare Stream here if needed)
    videos.ts                All video/channel/report-state data-fetching lives here
    moderation.ts             getOpenReports() for the admin queue
    auth.ts                  NextAuth config (Credentials provider, JWT sessions, role on session)
  middleware.ts               Redirects signed-out visitors away from /upload,
                               non-moderators away from /admin/*
  types/next-auth.d.ts        Adds id/username/role to NextAuth's Session type
```

## Data model notes

- `Channel` is separate from `User` (1:1 for now) so multi-owner/team
  channels are possible later without a migration that splits them apart.
- `Video.status` (`PROCESSING` → `READY`/`FAILED`, or `REMOVED` if a
  moderator hides it) tracks both the Mux transcode lifecycle and
  moderation state in one field.
- `Comment.isHidden` is soft-moderation — a hidden comment stays in the
  database (for the reporter/moderator's record) but is filtered out of
  every query that renders comments publicly.
- Replies are one level deep on purpose (`Comment.parentId` only ever
  points at a top-level comment, enforced in the comments API route) —
  keeps threading simple rather than open-ended nesting.

## On the algorithm

The home feed (`getFeedVideos` in `src/lib/videos.ts`) is deliberately
*just* "newest first, everyone included." That's the whole ranking logic
for now, on purpose — the founding motivation was YouTube/Twitch burying
small and new creators. If/when you add ranking, treat it as a
replacement for that one query, not a rewrite of the pages that call it.

## Moderation

Anyone logged in can report a video or a comment (reason + optional
details) via the Report button next to each. A person can have at most
one *open* report on a given item at a time — filing again while one is
still pending is blocked, but they're free to report it again after a
moderator resolves it (see `src/app/api/reports/route.ts`).

`/admin/moderation` lists open reports oldest-first. Resolving one
either hides the content (`Video.status = REMOVED` or
`Comment.isHidden = true`) or dismisses the report — both close it out.

**To access the queue:** the page and its API route both require
`role` to be `ADMIN` or `MODERATOR` on the `User` row. There's no
invite UI yet — promote yourself via `npx prisma studio` (edit your
`User` row's `role`), then log out and back in, since `role` is baked
into the session at login time and won't update on a running session.

## Auth

Email/password only for now (Credentials provider, JWT sessions — no
database session table needed). Every sign-up automatically gets a
`Channel` (see `/api/auth/register`), matching the "no separate
become-a-creator step" goal. Generate a real secret before you deploy:

```bash
npx auth secret   # writes AUTH_SECRET into .env for you
```

Adding Google/GitHub sign-in later is additive — just add the provider
to the `providers` array in `src/lib/auth.ts`; nothing else changes.

## Design

"Open Stage" — warm ink-dark palette (not neutral gray/black), one
amber accent (`marquee-500`) spent on every primary action/link, with
`signal-500` (red) and `moss-500` (green) reserved only for
error/live and success states respectively — never decorative. Type
pairing is Big Shoulders Display (titles) + Public Sans (everything
else). All of it lives as CSS variables in `src/app/globals.css`, so a
light mode later is a second set of values plus a toggle, not a
rewrite of every component.

## Known limitations / not built yet

1. **Dev and production currently share one database.** Convenient
   while solo-testing, but means local experiments and real user data
   live in the same place — split these before this has real users.
2. **Search/tags UI** — `Tag` model exists; no UI yet.
3. **Live streaming** — deliberately deferred per the MVP order (VOD
   first). Mux also supports live ingest (RTMP → the same playback
   pipeline), so the same `Video`/`Channel` models should extend rather
   than need a parallel system — worth designing that extension before
   you start, so live and VOD don't end up feeling like separate products
   again.
4. **No admin-invite flow** — promoting a moderator is a manual
   Prisma Studio edit (see Moderation, above).
