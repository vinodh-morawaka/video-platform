import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reconcileVideoWithMux } from "@/lib/videos";
import { auth } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;
  const video = await prisma.video.findUnique({ where: { id }, select: { uploaderId: true } });
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const isOwner = video.uploaderId === session.user.id;
  const isModerator = session.user.role === "ADMIN" || session.user.role === "MODERATOR";
  if (!isOwner && !isModerator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await reconcileVideoWithMux(id);
    return NextResponse.json(result);
  } catch (err) {
    // Belt-and-suspenders: reconcileVideoWithMux already catches the
    // specific failure modes we anticipated, but this route should never
    // crash with an empty/non-JSON body regardless of what goes wrong —
    // that's exactly what caused a confusing "Unexpected end of JSON
    // input" on the client the one time this wasn't here.
    console.error("Video reconciliation failed:", err);
    return NextResponse.json({ error: "Couldn't check status right now" }, { status: 500 });
  }
}
