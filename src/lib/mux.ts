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
      playback_policy: ["public"],
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

export default mux;
