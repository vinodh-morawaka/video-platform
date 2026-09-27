import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import mux from "@/lib/mux";

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
      // The creator started broadcasting. Find which Channel owns this
      // persistent live stream, then create (or, on a duplicate webhook
      // delivery, leave alone) the Video row viewers will see while live.
      const liveStream = event.data as { id: string };
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
    case "video.asset.ready": {
      const asset = event.data as {
        id: string;
        upload_id?: string;
        live_stream_id?: string;
        playback_ids?: { id: string }[];
        duration?: number;
      };
      // Match on the original upload id, the asset id, OR (for a
      // completed live broadcast) the live stream id — whichever this
      // Video row still holds as its providerAssetId. Relying on
      // swap-order alone caused ready events that arrive first to
      // silently match zero rows and leave videos stuck at PROCESSING
      // forever.
      const playbackId = asset.playback_ids?.[0]?.id;
      await prisma.video.updateMany({
        where: {
          OR: [
            ...(asset.upload_id ? [{ providerAssetId: asset.upload_id }] : []),
            ...(asset.live_stream_id ? [{ providerAssetId: asset.live_stream_id }] : []),
            { providerAssetId: asset.id },
          ],
        },
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
      break;
    }
    case "video.asset.errored": {
      const asset = event.data as { id: string; upload_id?: string; live_stream_id?: string };
      await prisma.video.updateMany({
        where: {
          OR: [
            ...(asset.upload_id ? [{ providerAssetId: asset.upload_id }] : []),
            ...(asset.live_stream_id ? [{ providerAssetId: asset.live_stream_id }] : []),
            { providerAssetId: asset.id },
          ],
        },
        data: { status: "FAILED" },
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
