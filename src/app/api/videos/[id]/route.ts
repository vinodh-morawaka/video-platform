import { NextRequest, NextResponse } from "next/server";
import { getVideoById, incrementViewCount } from "@/lib/videos";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getVideoById(id);
  if (!video) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ video });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Called by the player on playback start to bump the view counter.
  const { id } = await params;
  await incrementViewCount(id);
  return NextResponse.json({ ok: true });
}
