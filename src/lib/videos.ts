import { prisma } from "@/lib/prisma";
import type { Visibility, VideoStatus } from "@prisma/client";

export async function getFeedVideos({ take = 24, cursor }: { take?: number; cursor?: string } = {}) {
  // MVP discovery: newest-first from everyone. This is intentionally the
  // *entire* ranking algorithm for now — see areas/video-platform-startup
  // notes on avoiding YouTube/Twitch-style burial of small creators.
  // Anything smarter (recency + engagement blend, personalization) should
  // replace just this query, not the callers.
  return prisma.video.findMany({
    where: { status: { in: ["READY", "LIVE"] as VideoStatus[] }, visibility: "PUBLIC" as Visibility },
    orderBy: { publishedAt: "desc" },
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      channel: { select: { name: true, slug: true, owner: { select: { avatarUrl: true } } } },
    },
  });
}

export async function getVideoById(id: string) {
  return prisma.video.findUnique({
    where: { id },
    include: {
      channel: { select: { name: true, slug: true, ownerId: true } },
      comments: {
        where: { isHidden: false, parentId: null },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { username: true, avatarUrl: true } },
          replies: {
            where: { isHidden: false },
            orderBy: { createdAt: "asc" },
            include: { author: { select: { username: true, avatarUrl: true } } },
          },
        },
      },
      _count: { select: { likes: true } },
      tags: { select: { name: true } },
    },
  });
}

export async function getChannelBySlug(slug: string) {
  return prisma.channel.findUnique({
    where: { slug },
    include: {
      videos: {
        where: { status: { in: ["READY", "LIVE"] as VideoStatus[] }, visibility: "PUBLIC" as Visibility },
        orderBy: { publishedAt: "desc" },
      },
      _count: { select: { followers: true } },
    },
  });
}

export async function getVideosByTag(name: string) {
  return prisma.video.findMany({
    where: {
      status: "READY" as VideoStatus,
      visibility: "PUBLIC" as Visibility,
      tags: { some: { name: name.toLowerCase() } },
    },
    orderBy: { publishedAt: "desc" },
    include: {
      channel: { select: { name: true, slug: true, owner: { select: { avatarUrl: true } } } },
    },
  });
}

// Simple substring match on title/description, or an exact tag match — no
// full-text search/ranking yet. Good enough for the current catalog size;
// swap for Postgres full-text search (or a search service) once this
// stops being sufficient, without needing to change any caller.
export async function searchVideos(query: string) {
  if (!query.trim()) return [];
  return prisma.video.findMany({
    where: {
      status: "READY" as VideoStatus,
      visibility: "PUBLIC" as Visibility,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { tags: { some: { name: query.toLowerCase() } } },
      ],
    },
    orderBy: { publishedAt: "desc" },
    take: 48,
    include: {
      channel: { select: { name: true, slug: true, owner: { select: { avatarUrl: true } } } },
    },
  });
}

export async function getChannelLiveVideo(channelId: string) {
  return prisma.video.findFirst({
    where: { channelId, status: "LIVE" as VideoStatus },
    select: { id: true, title: true },
  });
}

export async function incrementViewCount(id: string) {
  return prisma.video.update({ where: { id }, data: { viewCount: { increment: 1 } } });
}

// Returns which of this video's own reportable items (the video itself,
// and any of its comments) this specific user already has an OPEN report
// on — so the UI can show "Already reported" instead of a fresh Report
// button after a page refresh. One query for the whole page.
export async function getUsersOpenReportsForVideo(userId: string, videoId: string, commentIds: string[]) {
  const reports = await prisma.report.findMany({
    where: {
      reporterId: userId,
      status: "OPEN",
      OR: [{ videoId }, { commentId: { in: commentIds } }],
    },
    select: { videoId: true, commentId: true },
  });

  return {
    video: reports.some((r) => r.videoId === videoId),
    commentIds: new Set<string>(reports.filter((r) => r.commentId).map((r) => r.commentId as string)),
  };
}
