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
    case "video.asset.ready": {
      const asset = event.data as {
        id: string;
        upload_id?: string;
        playback_ids?: { id: string }[];
        duration?: number;
      };
      // Match on EITHER the original upload id (still stored if the
      // "asset_created" swap above hasn't landed yet) or the asset id
      // (if it has). Relying on swap-order alone caused ready events
      // that arrive first to silently match zero rows and leave videos
      // stuck at PROCESSING forever.
      const playbackId = asset.playback_ids?.[0]?.id;
      await prisma.video.updateMany({
        where: {
          OR: [
            ...(asset.upload_id ? [{ providerAssetId: asset.upload_id }] : []),
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
      const asset = event.data as { id: string; upload_id?: string };
      await prisma.video.updateMany({
        where: {
          OR: [
            ...(asset.upload_id ? [{ providerAssetId: asset.upload_id }] : []),
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
