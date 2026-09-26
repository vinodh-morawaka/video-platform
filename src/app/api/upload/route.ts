import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createDirectUpload } from "@/lib/mux";
import { auth } from "@/lib/auth";

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
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
  const { title, description } = parsed.data;

  // Every user has exactly one Channel (created at sign-up), so this is
  // always a single lookup — no client-supplied channelId to trust.
  const channel = await prisma.channel.findUnique({ where: { ownerId: session.user.id } });
  if (!channel) {
    return NextResponse.json({ error: "No channel found for this account" }, { status: 404 });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "*";
  const { uploadId, uploadUrl } = await createDirectUpload(origin);

  // Create the Video row up front in PROCESSING state, keyed to the Mux
  // upload id so the webhook can find and update it once encoding finishes.
  const video = await prisma.video.create({
    data: {
      title,
      description,
      channelId: channel.id,
      uploaderId: session.user.id,
      provider: "MUX",
      providerAssetId: uploadId, // temporarily the upload id; webhook swaps to asset id
      status: "PROCESSING",
    },
  });

  return NextResponse.json({ videoId: video.id, uploadUrl });
}
