"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type VideoCardProps = {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  viewCount: number;
  channelName: string;
  channelSlug: string;
};

function formatDuration(seconds?: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoCard({
  id,
  title,
  thumbnailUrl,
  durationSeconds,
  viewCount,
  channelName,
  channelSlug,
}: VideoCardProps) {
  const router = useRouter();

  return (
    // A plain clickable div, not a Link/<a> — the channel name below is a
    // real <a>, and HTML doesn't allow nesting an <a> inside another <a>.
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/watch/${id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/watch/${id}`);
      }}
      className="group flex cursor-pointer flex-col gap-2"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-ink-900">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-paper-100/40 text-sm">
            No thumbnail
          </div>
        )}
        {durationSeconds ? (
          <span className="absolute bottom-1 right-1 rounded bg-ink-950/80 px-1.5 py-0.5 text-xs text-paper-100">
            {formatDuration(durationSeconds)}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col">
        <h3 className="line-clamp-2 text-sm font-medium text-paper-100">{title}</h3>
        <Link
          href={`/channel/${channelSlug}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-paper-100/60 hover:text-marquee-500"
        >
          {channelName}
        </Link>
        <span className="text-xs text-paper-100/40">{viewCount.toLocaleString()} views</span>
      </div>
    </div>
  );
}
