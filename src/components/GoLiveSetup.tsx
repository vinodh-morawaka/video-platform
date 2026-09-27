"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GoLiveSetup() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSetup() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/live/setup", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to set up live streaming");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-paper-100/70">
        Set up your channel&apos;s live stream once — you&apos;ll reuse the same RTMP URL and
        stream key every time you go live afterward.
      </p>
      {error ? <p className="text-sm text-signal-500">{error}</p> : null}
      <button
        onClick={handleSetup}
        disabled={submitting}
        className="w-fit rounded-full bg-marquee-500 px-4 py-2 text-sm font-medium text-ink-950 hover:bg-marquee-600 disabled:opacity-50"
      >
        {submitting ? "Setting up…" : "Set up live streaming"}
      </button>
    </div>
  );
}
