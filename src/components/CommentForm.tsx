"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CommentForm({
  videoId,
  parentId,
  onPosted,
  autoFocus,
  placeholder = "Add a comment…",
}: {
  videoId: string;
  parentId?: string;
  onPosted?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, parentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to post comment");
      }
      setBody("");
      router.refresh(); // re-fetches the server-rendered comment list with the new comment included
      onPosted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={2}
        autoFocus={autoFocus}
        maxLength={2000}
        className="rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-sm text-paper-100 placeholder:text-paper-100/40 focus:border-marquee-500 focus:outline-none"
      />
      {error ? <p className="text-xs text-signal-500">{error}</p> : null}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="rounded-full bg-marquee-500 px-4 py-1.5 text-sm font-medium text-ink-950 hover:bg-marquee-600 disabled:opacity-40"
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
