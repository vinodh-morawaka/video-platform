import { getFeedVideos } from "@/lib/videos";
import VideoCard from "@/components/VideoCard";

export const revalidate = 0; // always fresh for now; add caching once traffic warrants it

export default async function HomePage() {
  const videos = await getFeedVideos();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-center text-paper-100/50">
          <p className="font-display text-2xl font-bold text-paper-100">No videos yet.</p>
          <p className="text-sm">Be the first to upload something.</p>
        </div>
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
              isLive={v.status === "LIVE"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
