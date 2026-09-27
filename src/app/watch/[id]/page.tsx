import { notFound } from "next/navigation";
import Link from "next/link";
import { getVideoById } from "@/lib/videos";
import VideoPlayer from "@/components/VideoPlayer";
import CommentsSection from "@/components/CommentsSection";
import { auth } from "@/lib/auth";

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [video, session] = await Promise.all([getVideoById(id), auth()]);
  if (!video) notFound();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="overflow-hidden rounded-xl bg-ink-900">
        {video.playbackId ? (
          <VideoPlayer playbackId={video.playbackId} videoId={video.id} />
        ) : (
          <div className="flex aspect-video items-center justify-center text-paper-100/50">
            Still processing — check back shortly.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-paper-100">{video.title}</h1>
        <div className="flex items-center gap-2 text-sm text-paper-100/50">
          <Link href={`/channel/${video.channel.slug}`} className="hover:text-marquee-500">
            {video.channel.name}
          </Link>
          <span>&middot;</span>
          <span>{video.viewCount.toLocaleString()} views</span>
          <span>&middot;</span>
          <span>{video._count.likes.toLocaleString()} likes</span>
        </div>
        {video.description ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-paper-100/70">{video.description}</p>
        ) : null}
      </div>

      <CommentsSection videoId={video.id} comments={video.comments} loggedIn={Boolean(session?.user)} />
    </div>
  );
}
