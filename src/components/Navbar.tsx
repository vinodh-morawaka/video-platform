import Link from "next/link";
import { Upload, Home } from "lucide-react";
import { auth } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

export default async function Navbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-800 bg-ink-950/90 px-4 py-3 backdrop-blur">
      <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-wide text-paper-100">
        <Home size={20} />
        <span>YourPlatform</span>
      </Link>
      <nav className="flex items-center gap-4">
        {session?.user ? (
          <>
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
