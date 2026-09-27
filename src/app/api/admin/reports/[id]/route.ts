import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const bodySchema = z.object({
  action: z.enum(["hide", "dismiss"]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user?.role;
  // Defense in depth — middleware already gates /admin pages, but this API
  // route can be hit directly, so it needs its own role check too.
  if (role !== "ADMIN" && role !== "MODERATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  if (report.status !== "OPEN") {
    return NextResponse.json({ error: "Report already resolved" }, { status: 409 });
  }

  if (parsed.data.action === "hide") {
    if (report.videoId) {
      await prisma.video.update({ where: { id: report.videoId }, data: { status: "REMOVED" } });
    } else if (report.commentId) {
      await prisma.comment.update({ where: { id: report.commentId }, data: { isHidden: true } });
    }
    await prisma.report.update({
      where: { id },
      data: { status: "ACTIONED", resolvedAt: new Date() },
    });
  } else {
    await prisma.report.update({
      where: { id },
      data: { status: "DISMISSED", resolvedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
