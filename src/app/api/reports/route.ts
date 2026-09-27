import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const REASONS = [
  "SPAM",
  "HARASSMENT",
  "HATE_SPEECH",
  "COPYRIGHT",
  "SEXUAL_CONTENT",
  "VIOLENCE",
  "OTHER",
] as const;

const bodySchema = z
  .object({
    videoId: z.string().optional(),
    commentId: z.string().optional(),
    reason: z.enum(REASONS),
    details: z.string().max(1000).optional(),
  })
  .refine((data) => Boolean(data.videoId) !== Boolean(data.commentId), {
    message: "Report exactly one of videoId or commentId",
  });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { videoId, commentId, reason, details } = parsed.data;

  if (videoId) {
    const video = await prisma.video.findUnique({ where: { id: videoId }, select: { id: true } });
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  if (commentId) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { id: true } });
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Block a duplicate only while a previous report from this same person on
  // this same item is still OPEN. Once an admin resolves it (dismiss or
  // action), the slate is clear and they can report it again if needed —
  // a permanent one-report-ever rule would wrongly lock someone out from
  // flagging a repeat offense.
  const existingOpenReport = await prisma.report.findFirst({
    where: { reporterId: session.user.id, videoId, commentId, status: "OPEN" },
    select: { id: true },
  });
  if (existingOpenReport) {
    return NextResponse.json({ error: "You've already reported this" }, { status: 409 });
  }

  const report = await prisma.report.create({
    data: {
      reporterId: session.user.id,
      videoId,
      commentId,
      reason,
      details,
    },
  });
  return NextResponse.json({ id: report.id });
}
