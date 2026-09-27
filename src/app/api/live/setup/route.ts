import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLiveStream } from "@/lib/mux";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const channel = await prisma.channel.findUnique({ where: { ownerId: session.user.id } });
  if (!channel) {
    return NextResponse.json({ error: "No channel found for this account" }, { status: 404 });
  }

  // Idempotent — if this channel already has a live stream set up, just
  // hand back confirmation rather than creating a second one. The stream
  // key is only ever created once and reused for every future broadcast.
  if (channel.muxLiveStreamId) {
    return NextResponse.json({ ok: true, alreadyExists: true });
  }

  const { liveStreamId, streamKey, playbackId } = await createLiveStream();

  await prisma.channel.update({
    where: { id: channel.id },
    data: { muxLiveStreamId: liveStreamId, muxStreamKey: streamKey, livePlaybackId: playbackId },
  });

  return NextResponse.json({ ok: true, alreadyExists: false });
}
