import { getVideosByTag } from "@/lib/videos";
import VideoCard from "@/components/VideoCard";

export default async function TagPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const videos = await getVideosByTag(decodeURIComponent(name));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 font-display text-2xl font-bold text-paper-100">#{name}</h1>

      {videos.length === 0 ? (
        <p className="text-sm text-paper-100/50">No videos tagged #{name} yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((v) => (
            <VideoCard
              key={v.id}
              id={v.id}
              title={v.title}
              thumbnailUrl={v.thumbnailUrl}
              durationSeconds={v.durationSeconds}
              viewCount={v.viewCount}
              channelName={v.channel.name}
              channelSlug={v.channel.slug}
            />
          ))}
        </div>
      )}
    </div>
  );
}
