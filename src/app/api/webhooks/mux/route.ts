import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import mux, { getLiveStream } from "@/lib/mux";

// Resolve an asset event to exactly ONE Video row. The old approach was a
// single broad OR-match (upload id / live stream id / asset id) fed to
// updateMany — but a channel's live stream id is shared by every broadcast
// it ever does, so that query could match two rows at once (the row that
// already holds this asset's id, plus any other row still holding the live
// stream id) and then try to give both the same providerAssetId, tripping
// its unique constraint. The webhook crashed with a 500, Mux retried, and
// the retries failed identically. Checking in a fixed order and stopping
// at the first hit can't match more than one row.
async function findVideoIdForAsset(asset: { id: string; upload_id?: string; live_stream_id?: string }) {
  // 1. Already linked to this exact asset (e.g. the second of "ready" and
  //    "live_stream_completed", or a redelivery) — refresh that row only.
  const linked = await prisma.video.findUnique({
    where: { providerAssetId: asset.id },
    select: { id: true },
  });
  if (linked) return linked.id;

  // 2. A direct upload that hasn't been swapped to its asset id yet.
  if (asset.upload_id) {
    const upload = await prisma.video.findUnique({
      where: { providerAssetId: asset.upload_id },
      select: { id: true },
    });
    if (upload) return upload.id;
  }

  // 3. A broadcast that has ended (PROCESSING) and is still holding the
  //    shared live stream id. Requiring PROCESSING keeps a currently-live
  //    session from being claimed by an event for an earlier recording.
  if (asset.live_stream_id) {
    const ended = await prisma.video.findFirst({
      where: { providerAssetId: asset.live_stream_id, status: "PROCESSING" },
      select: { id: true },
    });
    if (ended) return ended.id;
  }

  return null;
}

// Configure this exact URL (https://yourapp.com/api/webhooks/mux) in the
// Mux dashboard, and set MUX_WEBHOOK_SECRET so signatures verify below.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("mux-signature") ?? "";

  let event;
  try {
    event = await mux.webhooks.unwrap(rawBody, { "mux-signature": signature }, process.env.MUX_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "video.upload.asset_created": {
      // Link the upload id (stored as providerAssetId at create time) to the
      // real asset id.
      const uploadId = event.data.id;
      const assetId = (event.data as { asset_id?: string }).asset_id;
      if (assetId) {
        await prisma.video.updateMany({
          where: { providerAssetId: uploadId },
          data: { providerAssetId: assetId },
        });
      }
      break;
    }
    case "video.live_stream.active": {
      // The creator started broadcasting — in theory. Webhooks can be
      // redelivered late (observed directly in testing: a duplicate
      // "active" arrived well after the real session had already
      // finished and its row had moved on, creating a phantom second
      // row for a broadcast that never happened the second time). Ask
      // Mux whether the stream is ACTUALLY active right now before
      // creating anything, rather than trusting the notification blindly.
      const liveStream = event.data as { id: string };
      const currentStream = await getLiveStream(liveStream.id).catch(() => null);
      if (!currentStream || currentStream.status !== "active") break;

      const channel = await prisma.channel.findUnique({
        where: { muxLiveStreamId: liveStream.id },
        select: { id: true, ownerId: true, name: true, livePlaybackId: true },
      });
      if (!channel) break;

      await prisma.video.upsert({
        where: { providerAssetId: liveStream.id },
        update: {}, // already exists (duplicate delivery, or a reconnect) — leave as is
        create: {
          title: `${channel.name} — Live`,
          channelId: channel.id,
          uploaderId: channel.ownerId,
          provider: "MUX",
          providerAssetId: liveStream.id,
          playbackId: channel.livePlaybackId,
          status: "LIVE",
          publishedAt: new Date(),
        },
      });
      break;
    }
    case "video.live_stream.idle": {
      // The broadcast has genuinely ended (past the reconnect window) —
      // NOT the same as "disconnected", which might still reconnect.
      // Move the Video row into PROCESSING while Mux finishes turning the
      // recording into a normal on-demand asset; clear playbackId since
      // the live one no longer serves anything, so the watch page shows
      // "still processing" instead of a dead player.
      const liveStream = event.data as { id: string };
      await prisma.video.updateMany({
        where: { providerAssetId: liveStream.id, status: "LIVE" },
        data: { status: "PROCESSING", playbackId: null },
      });
      break;
    }
    case "video.asset.ready":
    case "video.asset.live_stream_completed": {
      const asset = event.data as {
        id: string;
        upload_id?: string;
        live_stream_id?: string;
        playback_ids?: { id: string }[];
        duration?: number;
      };
      // Live-originated assets fire BOTH "video.asset.live_stream_completed"
      // and "video.asset.ready" — sometimes with a real delay between them,
      // and testing showed "ready" alone isn't a reliable enough signal on
      // its own. Handling both here is idempotent (safe if both arrive).
      const playbackId = asset.playback_ids?.[0]?.id;
      const videoId = await findVideoIdForAsset(asset);
      if (videoId) {
        await prisma.video.update({
          where: { id: videoId },
          data: {
            providerAssetId: asset.id,
            status: "READY",
            playbackId,
            // Mux auto-generates a thumbnail for every playback id at this
            // predictable URL — no separate API call needed.
            thumbnailUrl: playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : undefined,
            durationSeconds: asset.duration ? Math.round(asset.duration) : undefined,
            publishedAt: new Date(),
          },
        });
      }
      break;
    }
    case "video.asset.errored": {
      const asset = event.data as { id: string; upload_id?: string; live_stream_id?: string };
      const videoId = await findVideoIdForAsset(asset);
      if (videoId) {
        await prisma.video.update({ where: { id: videoId }, data: { status: "FAILED" } });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
