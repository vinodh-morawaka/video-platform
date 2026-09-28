"use client";

import MuxPlayer from "@mux/mux-player-react";
import { useRef } from "react";

export default function VideoPlayer({
  playbackId,
  videoId,
  isLive,
}: {
  playbackId: string;
  videoId: string;
  isLive?: boolean;
}) {
  const counted = useRef(false);

  return (
    <MuxPlayer
      // Remount when switching between live and on-demand (or to a new
      // playback id). Without this, React reuses the same player instance
      // when a stream ends and the page re-renders as a VOD, and the
      // player keeps its live-mode controls — no time slider — until a
      // full page reload.
      key={`${playbackId}-${isLive ? "live" : "vod"}`}
      playbackId={playbackId}
      metadata={{ video_id: videoId }}
      streamType={isLive ? "live" : "on-demand"}
      className="aspect-video w-full"
      onPlay={() => {
        if (isLive || counted.current) return;
        counted.current = true;
        fetch(`/api/videos/${videoId}`, { method: "POST" }).catch(() => {});
      }}
    />
  );
}
