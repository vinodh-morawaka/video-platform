import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const ROLES = ["VIEWER", "CREATOR", "MODERATOR", "ADMIN"] as const;
const bodySchema = z.object({ role: z.enum(ROLES) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Block changing your own role through this UI — simplest way to avoid
  // an admin accidentally locking themselves out (e.g. demoting the only
  // ADMIN account). Use Prisma Studio directly for that, deliberately.
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "You can't change your own role here — use Prisma Studio for that." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.user.update({ where: { id }, data: { role: parsed.data.role } });

  return NextResponse.json({ ok: true });
}
