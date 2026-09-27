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

  const result = await reconcileVideoWithMux(id);
  return NextResponse.json(result);
}
