import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChannelLiveVideo } from "@/lib/videos";
import { MUX_RTMP_URL } from "@/lib/mux";
import GoLiveSetup from "@/components/GoLiveSetup";
import StreamCredentials from "@/components/StreamCredentials";
import AutoRefresh from "@/components/AutoRefresh";

export default async function GoLivePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const channel = await prisma.channel.findUnique({ where: { ownerId: session.user.id } });
  if (!channel) redirect("/");

  const liveVideo = channel.muxLiveStreamId ? await getChannelLiveVideo(channel.id) : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      {/* Once a stream is set up, keep checking whether the broadcast has
          started/stopped so the banner below updates without a reload. Client
          state here (e.g. the revealed stream key) survives each refresh. */}
      {channel.muxLiveStreamId ? <AutoRefresh intervalMs={5_000} /> : null}
      <h1 className="mb-6 font-display text-2xl font-bold text-paper-100">Go live</h1>

      {liveVideo ? (
        <div className="mb-6 rounded-lg border border-signal-500 bg-signal-500/10 px-4 py-3 text-sm text-paper-100">
          You&apos;re currently live —{" "}
          <Link href={`/watch/${liveVideo.id}`} className="text-marquee-500 underline">
            view your stream
          </Link>
          .
        </div>
      ) : null}

      {!channel.muxLiveStreamId ? (
        <GoLiveSetup />
      ) : (
        <div className="flex flex-col gap-6">
          <StreamCredentials rtmpUrl={MUX_RTMP_URL} streamKey={channel.muxStreamKey ?? ""} />
          <p className="text-sm text-paper-100/50">
            Point OBS (or similar broadcasting software) at these two values. Once you start
            broadcasting, your stream will automatically appear on your channel page and the
            home feed — no need to do anything here first. Stopping the broadcast will, after a
            short delay, turn the recording into a regular video in your catalog.
          </p>
        </div>
      )}
    </div>
  );
}
