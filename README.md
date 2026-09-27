# video-platform

VOD + live video platform (YouTube+Twitch combined). Solo-dev friendly
stack: Next.js on Vercel, managed Postgres, Mux for all video infra
(uploads, live ingest, transcoding, playback) — no self-hosted
encoding/storage.

**Live:** https://video-platform-kappa-nine.vercel.app

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **Prisma 5** + **Postgres** (Neon) — schema in `prisma/schema.prisma`
- **Auth.js (NextAuth v5)** — email/password (Credentials provider), JWT sessions
- **Mux** — direct-to-cloud uploads AND live (RTMP) ingest, transcoding, adaptive playback
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
`MUX_WEBHOOK_SECRET`. This one endpoint handles both upload/VOD events
and live-stream events (`video.live_stream.active` / `.idle`) — no
separate webhook needed for live.

### Neon / Vercel Postgres connection strings

Use the **pooled** connection string for `DATABASE_URL` (hostname
contains `-pooler`, with `&pgbouncer=true` appended) and the
**unpooled** one for `DIRECT_URL`. Prisma's dev server and Vercel's
serverless functions both open many short-lived connections, which
Neon's free tier will otherwise close under you — see the `directUrl`
comment in `prisma/schema.prisma`.

### Local dev uses a separate database branch

Local development points at a Neon **branch** (`development`), not
the production database — created once via Neon's "Create child
branch" (an instant copy of prod's schema + data, then fully
isolated going forward). Local `.env` has that branch's connection
strings; Vercel's production env vars are untouched and still point
at `main`. If you ever recreate this: `.env` is the only file that
matters for both `npm run dev` and the Prisma CLI — **`.env.local`
must not also define `DATABASE_URL`/`DIRECT_URL`**, since Next.js
would silently prefer `.env.local`'s value for the running app while
the Prisma CLI keeps reading `.env`, leaving the two disagreeing
about which database is real.

One consequence: Mux's webhook is configured for the production URL,
so videos uploaded through `npm run dev` will sit at `PROCESSING`
forever unless you also set up a second Mux webhook endpoint pointed
at a local `ngrok` tunnel (same idea as the "Getting a Mux account"
section above, just a second endpoint rather than replacing the
production one).

### Uploading

Sign up at `/signup`, log in at `/login`, then go to `/upload` — every
account gets its own `Channel` automatically at sign-up. The upload API
route derives who's uploading from your session; there's no hardcoded
dev-user workaround.

## Project structure

```
prisma/schema.prisma        Data model (User, Channel, Video, Comment, Like, Report, Tag, ...)
src/
  app/
    page.tsx                Home feed (newest videos — see "On the algorithm" below)
    watch/[id]/page.tsx      Watch page (Mux player, comments, tags, report buttons)
    channel/[slug]/page.tsx  Channel page
    tag/[name]/page.tsx      All public videos with a given tag
    search/page.tsx          Search results (reads ?q=)
    upload/page.tsx          Server wrapper: redirects to /login if signed out
    go-live/page.tsx          Shows RTMP URL + stream key, or the one-time setup button
    login/page.tsx           Login form (NextAuth Credentials sign-in)
    signup/page.tsx          Sign-up form (posts to /api/auth/register)
    admin/moderation/page.tsx  Moderation queue (ADMIN/MODERATOR only)
    admin/users/page.tsx      User role management (ADMIN only)
    api/
      auth/[...nextauth]/route.ts  NextAuth's own handler (session, sign-in, sign-out)
      auth/register/route.ts       Custom sign-up: hashes password, creates User + Channel
      videos/route.ts              GET feed
      videos/[id]/route.ts         GET one video, POST to bump view count
      videos/[id]/comments/route.ts POST a comment or reply
      upload/route.ts              POST: creates a Mux direct upload + pending Video row,
                                    connects/creates tags (uploader/channel come from the
                                    session, not the client)
      webhooks/mux/route.ts        Mux → us: flips Video to READY once transcoded,
                                    AND creates/updates the Video row for live streams
      live/setup/route.ts          POST: lazily creates a channel's one persistent
                                    Mux live stream (idempotent)
      reports/route.ts             POST: file a report against a video or comment
      admin/reports/[id]/route.ts  POST: resolve a report (hide content, or dismiss)
      admin/users/[id]/route.ts    PATCH: change a user's role (ADMIN only)
  components/
    VideoCard.tsx, VideoPlayer.tsx, Navbar.tsx, UploadForm.tsx, SignOutButton.tsx
    CommentForm.tsx, CommentsSection.tsx    Comment posting + replies
    ReportButton.tsx, ModerationQueue.tsx   Reporting + the admin moderation queue UI
    SearchBox.tsx, UserRoleManager.tsx      Navbar search + the admin user-role table
    GoLiveSetup.tsx, StreamCredentials.tsx  The go-live setup button + credentials display
  lib/
    prisma.ts                Prisma client singleton
    mux.ts                   Mux SDK wrapper — uploads AND live streams (swap for
                              Cloudflare Stream here if needed)
    videos.ts                Video/channel/tag/search/report-state/live-status data-fetching
    moderation.ts             getOpenReports() for the admin queue
    users.ts                  getAllUsers() for the admin user-role page
    auth.ts                  NextAuth config (Credentials provider, JWT sessions, role on session)
  middleware.ts               Redirects signed-out visitors away from /upload,
                               non-moderators away from /admin/*, non-admins away
                               from /admin/users specifically
  types/next-auth.d.ts        Adds id/username/role to NextAuth's Session type
```

## Data model notes

- `Channel` is separate from `User` (1:1 for now) so multi-owner/team
  channels are possible later without a migration that splits them apart.
- `Video.status` (`PROCESSING` → `READY`/`FAILED`, `LIVE` while
  broadcasting, or `REMOVED` if a moderator hides it) tracks both the
  Mux transcode/broadcast lifecycle and moderation state in one field.
- `Channel.muxLiveStreamId`/`muxStreamKey`/`livePlaybackId` are set
  once (lazily, on first `/go-live` setup) and reused for every future
  broadcast — see "Live streaming" below.
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

## Live streaming

One **persistent** Mux Live Stream per channel — created once, lazily,
on first visit to `/go-live` (`POST /api/live/setup`, idempotent). The
creator configures OBS (or similar) with the RTMP URL + stream key
shown there a single time and reuses it for every future broadcast;
nothing on our side needs to change between sessions.

**Lifecycle, entirely webhook-driven** (`src/app/api/webhooks/mux/route.ts`):
1. Creator starts broadcasting → Mux fires `video.live_stream.active`
   → we create a `Video` row (`status: LIVE`, `providerAssetId` = the
   live stream's own id) so it shows up in the feed/channel page
   immediately, with a LIVE badge.
2. Creator stops → after Mux's reconnect window elapses (NOT the same
   as `video.live_stream.disconnected`, which might still reconnect),
   `video.live_stream.idle` fires → that Video row moves to
   `PROCESSING` and its live `playbackId` is cleared.
3. Mux finishes turning the recording into a normal on-demand asset →
   fires `video.asset.live_stream_completed` (and separately,
   `video.asset.ready`) — the SAME handler used for regular uploads'
   ready event now also runs for both of these, matching on
   `asset.live_stream_id` → the Video row becomes a completely ordinary
   `READY` video with its own VOD playback id, thumbnail, duration,
   comments, tags, everything.

Testing this live (not just reading Mux's docs) surfaced a real gap:
`video.asset.ready` alone was NOT a reliable enough signal for a
live-originated asset in practice — `video.asset.live_stream_completed`
is a genuinely separate event Mux also fires, and relying on `ready`
alone left videos stuck at `PROCESSING` indefinitely on both local
(ngrok) and production testing. Both are now handled identically in
`src/app/api/webhooks/mux/route.ts` (idempotent if both arrive).

That last point is the actual point of this design: a finished stream
isn't a special "past broadcast" type — it's the exact same `Video`
row, indistinguishable from an upload, appearing in search/tags/the
feed like anything else.

**Known edge case:** if a creator stops and near-instantly restarts
within the same narrow window before `video.asset.ready` has landed
for the previous session, the new `video.live_stream.active` could
theoretically collide with the still-`PROCESSING` row's
`providerAssetId` (which is `@unique`). In practice Mux's own
reconnect window (a reconnect within it resumes the same session
rather than firing `idle` at all) makes this rare; the webhook uses
`upsert` so a duplicate delivery is at least harmless, but a genuine
double-collision isn't specially handled. Worth revisiting if it ever
actually happens.

**Explicitly not built in this pass:** live chat, viewer count, follow
notifications when a channel goes live, and scheduling a stream in
advance. Each is a real, separate feature, deliberately scoped out to
get the core go-live → watch → becomes-a-VOD loop working first.

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
`role` to be `ADMIN` or `MODERATOR` on the `User` row.

**Granting roles:** `/admin/users` (ADMIN only — stricter than the
moderation queue itself) lists every user with a role dropdown per
row. The one thing it can't do is promote *itself* into existence:
your very first `ADMIN` has to be set via `npx prisma studio` (edit
your own `User` row's `role`), since you need an existing admin to
grant admin through the UI. After that, use `/admin/users` for
everyone else. Either way, log out and back in after a role change —
`role` is baked into the session at login time and won't update on a
running session.

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

1. **No in-app change-password flow.** If any account's password needs
   rotating (including your own admin account — worth doing once this
   is more than a personal test site), the only path today is signing
   up fresh and promoting the new account via Prisma Studio, then
   demoting the old one. A real "change password" page is a legitimate
   gap, not just a nice-to-have.
2. **Search is plain substring matching**, not Postgres full-text
   search or a dedicated search service — fine at the current catalog
   size, worth upgrading once it isn't (see `searchVideos` in
   `src/lib/videos.ts` for the swap-out point).
