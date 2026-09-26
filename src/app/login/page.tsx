"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setSubmitting(false);
    if (result?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-6 font-display text-2xl font-bold text-paper-100">Log in</h1>
      {justRegistered ? (
        <p className="mb-4 text-sm text-moss-500">Account created — log in below.</p>
      ) : null}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-paper-100/70">Email</label>
          <input
            type="email"
            className="rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-sm text-paper-100 focus:border-marquee-500 focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-paper-100/70">Password</label>
          <input
            type="password"
            className="rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-sm text-paper-100 focus:border-marquee-500 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error ? <p className="text-sm text-signal-500">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-marquee-500 px-4 py-2 text-sm font-medium text-ink-950 hover:bg-marquee-600 disabled:opacity-50"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-paper-100/50">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-marquee-500 underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams() requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
