import Mux from "@mux/mux-node";

// Managed video infra: Mux handles ingest, transcoding, storage and
// playback delivery so we never run our own encoding pipeline.
// Swap this file out for a Cloudflare Stream client if you go that
// route instead — nothing else in the app should need to change,
// since callers only ever touch `createDirectUpload` / `getAsset`.

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function createDirectUpload(corsOrigin: string) {
  const upload = await mux.video.uploads.create({
    cors_origin: corsOrigin,
    new_asset_settings: {
      playback_policies: ["public"],
      video_quality: "basic",
    },
  });

  return { uploadId: upload.id, uploadUrl: upload.url };
}

export async function getUpload(uploadId: string) {
  return mux.video.uploads.retrieve(uploadId);
}

export async function getAsset(assetId: string) {
  return mux.video.assets.retrieve(assetId);
}

// Mux's RTMP(S) ingest endpoint is the same fixed URL for every stream —
// only the stream key (unique per Live Stream object) tells Mux which
// channel's broadcast this is.
export const MUX_RTMP_URL = "rtmps://global-live.mux.com:443/app";

// One persistent Live Stream per channel, created once (lazily, on first
// visit to /go-live) and reused for every future broadcast — the creator
// configures OBS/etc. a single time. `new_asset_settings` here is what
// makes Mux automatically turn each broadcast's recording into a normal
// on-demand asset once the stream goes idle, using the SAME asset
// lifecycle (video.asset.ready) as a regular upload.
export async function createLiveStream() {
  const stream = await mux.video.liveStreams.create({
    playback_policies: ["public"],
    new_asset_settings: { playback_policies: ["public"] },
    reconnect_window: 60,
  });

  return {
    liveStreamId: stream.id,
    streamKey: stream.stream_key,
    playbackId: stream.playback_ids?.[0]?.id,
  };
}

export async function getLiveStream(liveStreamId: string) {
  return mux.video.liveStreams.retrieve(liveStreamId);
}

export default mux;
