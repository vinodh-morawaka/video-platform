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
