import Link from "next/link";
import { Upload, Home, Shield } from "lucide-react";
import { auth } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";
import SearchBox from "@/components/SearchBox";

export default async function Navbar() {
  const session = await auth();
  const canModerate = session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-ink-800 bg-ink-950/90 px-4 py-3 backdrop-blur">
      <Link href="/" className="flex shrink-0 items-center gap-2 font-display text-xl font-bold tracking-wide text-paper-100">
        <Home size={20} />
        <span>YourPlatform</span>
      </Link>
      <SearchBox />
      <nav className="flex items-center gap-4">
        {session?.user ? (
          <>
            {canModerate ? (
              <Link
                href="/admin/moderation"
                className="flex items-center gap-1 text-sm text-paper-100/70 hover:text-marquee-500"
              >
                <Shield size={16} />
                Moderation
              </Link>
            ) : null}
            <Link
              href="/upload"
              className="flex items-center gap-1 rounded-full bg-marquee-500 px-3 py-1.5 text-sm font-medium text-ink-950 hover:bg-marquee-600"
            >
              <Upload size={16} />
              Upload
            </Link>
            <span className="text-sm text-paper-100/50">@{session.user.username}</span>
            <SignOutButton />
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm text-paper-100/70 hover:text-paper-100">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-marquee-500 px-3 py-1.5 text-sm font-medium text-ink-950 hover:bg-marquee-600"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
