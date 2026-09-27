import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const bodySchema = z.object({
  body: z.string().min(1).max(2000),
  parentId: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id: videoId } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { body, parentId } = parsed.data;

  const video = await prisma.video.findUnique({ where: { id: videoId }, select: { id: true } });
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (parentId) {
    // A reply must point at a top-level comment on this same video — this
    // keeps the thread one level deep and stops cross-video parentId abuse.
    const parent = await prisma.comment.findFirst({
      where: { id: parentId, videoId, parentId: null },
      select: { id: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "Invalid parent comment" }, { status: 400 });
    }
  }

  const comment = await prisma.comment.create({
    data: {
      videoId,
      authorId: session.user.id,
      body,
      parentId,
    },
    include: {
      author: { select: { username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ comment });
}
