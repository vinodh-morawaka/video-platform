import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Credentials-based auth, checked directly against the User table's
// passwordHash. No adapter/OAuth here — JWT sessions only, since the
// Credentials provider doesn't support database sessions. Add an OAuth
// provider (Google/GitHub) later by adding it to the `providers` array;
// nothing else in the app needs to change.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName ?? user.username,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // Used by `export { auth as middleware }` — return false to redirect
    // to pages.signIn. Only /upload is matched by middleware.ts's
    // `config.matcher`, but keep this scoped explicitly in case that
    // matcher list grows later.
    authorized({ auth, request }) {
      if (request.nextUrl.pathname.startsWith("/admin")) {
        const role = auth?.user?.role;
        return role === "ADMIN" || role === "MODERATOR";
      }
      if (request.nextUrl.pathname.startsWith("/upload")) {
        return Boolean(auth?.user);
      }
      return true;
    },
    // Carry the user id, username and role onto the JWT, then onto the
    // session object, so server components/route handlers can read them
    // without an extra DB round trip. NOTE: with JWT sessions, `user` is
    // only passed in on sign-in — if you promote someone's role in the
    // database later, they need to log out and back in to see it reflected.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string }).username;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
