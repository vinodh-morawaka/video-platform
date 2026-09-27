import { notFound } from "next/navigation";
import Link from "next/link";
import { getVideoById, getUsersOpenReportsForVideo } from "@/lib/videos";
import VideoPlayer from "@/components/VideoPlayer";
import CommentsSection from "@/components/CommentsSection";
import ReportButton from "@/components/ReportButton";
import RefreshStatusButton from "@/components/RefreshStatusButton";
import { auth } from "@/lib/auth";

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [video, session] = await Promise.all([getVideoById(id), auth()]);
  if (!video) notFound();

  const commentIds = video.comments.flatMap((c) => [c.id, ...c.replies.map((r) => r.id)]);
  const alreadyReported = session?.user
    ? await getUsersOpenReportsForVideo(session.user.id, video.id, commentIds)
    : null;
  const canReconcile =
    video.status === "PROCESSING" &&
    Boolean(
      session?.user &&
        (session.user.id === video.uploaderId ||
          session.user.role === "ADMIN" ||
          session.user.role === "MODERATOR"),
    );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="overflow-hidden rounded-xl bg-ink-900">
        {video.status === "REMOVED" ? (
          <div className="flex aspect-video items-center justify-center text-paper-100/50">
            This video was removed for violating community guidelines.
          </div>
        ) : video.status === "LIVE" && video.playbackId ? (
          <VideoPlayer playbackId={video.playbackId} videoId={video.id} isLive />
        ) : video.status === "READY" && video.playbackId ? (
          <VideoPlayer playbackId={video.playbackId} videoId={video.id} />
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center text-paper-100/50">
            Still processing — check back shortly.
            {canReconcile ? <RefreshStatusButton videoId={video.id} /> : null}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {video.status === "LIVE" ? (
            <span className="rounded bg-signal-500 px-1.5 py-0.5 text-xs font-medium text-ink-950">
              LIVE
            </span>
          ) : null}
          <h1 className="font-display text-2xl font-bold text-paper-100">{video.title}</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-paper-100/50">
          <Link href={`/channel/${video.channel.slug}`} className="hover:text-marquee-500">
            {video.channel.name}
          </Link>
          <span>&middot;</span>
          <span>{video.viewCount.toLocaleString()} views</span>
          <span>&middot;</span>
          <span>{video._count.likes.toLocaleString()} likes</span>
          {session?.user ? (
            <>
              <span>&middot;</span>
              <ReportButton videoId={video.id} alreadyReported={alreadyReported?.video} />
            </>
          ) : null}
        </div>
        {video.description ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-paper-100/70">{video.description}</p>
        ) : null}
        {video.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {video.tags.map((t) => (
              <Link
                key={t.name}
                href={`/tag/${encodeURIComponent(t.name)}`}
                className="rounded-full border border-ink-800 bg-ink-900 px-3 py-1.5 text-xs text-paper-100/70 hover:border-marquee-500 hover:text-marquee-500"
              >
                #{t.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <CommentsSection
        videoId={video.id}
        comments={video.comments}
        loggedIn={Boolean(session?.user)}
        reportedCommentIds={alreadyReported ? Array.from(alreadyReported.commentIds) : []}
      />
    </div>
  );
}
