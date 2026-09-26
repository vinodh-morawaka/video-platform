import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only"),
  displayName: z.string().min(1).max(100).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function slugify(username: string) {
  return username.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, username, displayName, password } = parsed.data;

  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { username } }),
  ]);
  if (existingEmail) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }
  if (existingUsername) {
    return NextResponse.json({ error: "That username is taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const baseSlug = slugify(username) || "channel";

  // Every account gets a Channel automatically — this app has no separate
  // "become a creator" step, matching the "no algorithm gatekeeping,
  // anyone can post" founding goal.
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        username,
        displayName: displayName ?? username,
        passwordHash,
        role: "CREATOR",
      },
    });

    let slug = baseSlug;
    let suffix = 1;
    // Slugs must be unique; append -2, -3, etc. on collision.
    while (await tx.channel.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    await tx.channel.create({
      data: {
        ownerId: created.id,
        name: displayName ?? username,
        slug,
      },
    });

    return created;
  });

  return NextResponse.json({ id: user.id, email: user.email, username: user.username });
}
