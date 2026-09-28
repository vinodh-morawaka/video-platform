"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshStatusButton({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/videos/${videoId}/reconcile`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!data) {
        throw new Error("Failed to check status — try again shortly.");
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to check status");
      }
      if (data.updated) {
        router.refresh();
      } else {
        setMessage(data.reason ?? "Still processing — try again in a bit.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col items-center gap-1">
      <button
        onClick={handleClick}
        disabled={submitting}
        className="rounded-full border border-ink-800 px-3 py-1.5 text-xs text-paper-100/70 hover:border-marquee-500 hover:text-marquee-500 disabled:opacity-40"
      >
        {submitting ? "Checking…" : "Check again"}
      </button>
      {message ? <p className="text-xs text-paper-100/40">{message}</p> : null}
    </div>
  );
}
