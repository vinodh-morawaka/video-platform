import { NextRequest, NextResponse } from "next/server";
import { getFeedVideos } from "@/lib/videos";

export async function GET(req: NextRequest) {
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const videos = await getFeedVideos({ cursor });
  return NextResponse.json({ videos });
}
