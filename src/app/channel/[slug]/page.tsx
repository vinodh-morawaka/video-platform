import { notFound } from "next/navigation";
import { getChannelBySlug } from "@/lib/videos";
import VideoCard from "@/components/VideoCard";

export default async function ChannelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const channel = await getChannelBySlug(slug);
  if (!channel) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-1 border-b border-ink-800 pb-6">
        <h1 className="font-display text-3xl font-bold text-paper-100">{channel.name}</h1>
        {channel.description ? (
          <p className="text-sm text-paper-100/60">{channel.description}</p>
        ) : null}
        <span className="text-xs text-paper-100/40">
          {channel._count.followers.toLocaleString()} followers
        </span>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {channel.videos.map((v) => (
          <VideoCard
            key={v.id}
            id={v.id}
            title={v.title}
            thumbnailUrl={v.thumbnailUrl}
            durationSeconds={v.durationSeconds}
            viewCount={v.viewCount}
            channelName={channel.name}
            channelSlug={channel.slug}
          />
        ))}
      </div>
    </div>
  );
}
