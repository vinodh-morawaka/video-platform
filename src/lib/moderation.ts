import { prisma } from "@/lib/prisma";

export async function getOpenReports() {
  return prisma.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" }, // oldest first — first reported, first reviewed
    include: {
      reporter: { select: { username: true } },
      video: { select: { id: true, title: true, status: true } },
      comment: {
        select: {
          id: true,
          body: true,
          isHidden: true,
          videoId: true,
          author: { select: { username: true } },
        },
      },
    },
  });
}
