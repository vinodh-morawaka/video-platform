"use client";

import MuxPlayer from "@mux/mux-player-react";
import { useRef } from "react";

export default function VideoPlayer({
  playbackId,
  videoId,
}: {
  playbackId: string;
  videoId: string;
}) {
  const counted = useRef(false);

  return (
    <MuxPlayer
      playbackId={playbackId}
      metadata={{ video_id: videoId }}
      streamType="on-demand"
      className="aspect-video w-full"
      onPlay={() => {
        if (counted.current) return;
        counted.current = true;
        fetch(`/api/videos/${videoId}`, { method: "POST" }).catch(() => {});
      }}
    />
  );
}
