"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Harassment or bullying",
  HATE_SPEECH: "Hate speech",
  COPYRIGHT: "Copyright infringement",
  SEXUAL_CONTENT: "Sexual content",
  VIOLENCE: "Violence",
  OTHER: "Other",
};

type Report = {
  id: string;
  reason: string;
  details: string | null;
  createdAt: Date | string;
  reporter: { username: string };
  video: { id: string; title: string; status: string } | null;
  comment: {
    id: string;
    body: string;
    isHidden: boolean;
    videoId: string;
    author: { username: string };
  } | null;
};

export default function ModerationQueue({ reports }: { reports: Report[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(id: string, action: "hide" | "dismiss") {
    setPendingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to resolve report");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingId(null);
    }
  }

  if (reports.length === 0) {
    return <p className="text-sm text-paper-100/50">No open reports. The queue is clear.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <p className="text-sm text-signal-500">{error}</p> : null}
      {reports.map((r) => (
        <div key={r.id} className="flex flex-col gap-2 rounded-lg border border-ink-800 bg-ink-900 p-4">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-signal-500/20 px-2 py-0.5 text-xs font-medium text-signal-500">
              {REASON_LABELS[r.reason] ?? r.reason}
            </span>
            <span className="text-xs text-paper-100/40">
              reported by {r.reporter.username} &middot; {new Date(r.createdAt).toLocaleString()}
            </span>
          </div>

          {r.video ? (
            <div className="text-sm text-paper-100">
              Video:{" "}
              <Link href={`/watch/${r.video.id}`} className="text-marquee-500 hover:underline">
                {r.video.title}
              </Link>{" "}
              <span className="text-paper-100/40">({r.video.status})</span>
            </div>
          ) : null}

          {r.comment ? (
            <div className="text-sm text-paper-100">
              <div className="text-paper-100/50">
                Comment by {r.comment.author.username}
                {r.comment.isHidden ? " (already hidden)" : ""}:
              </div>
              <p className="mt-1 text-paper-100/80">&ldquo;{r.comment.body}&rdquo;</p>
              <Link
                href={`/watch/${r.comment.videoId}`}
                className="text-xs text-marquee-500 hover:underline"
              >
                View on video
              </Link>
            </div>
          ) : null}

          {r.details ? (
            <p className="text-xs text-paper-100/50">Reporter notes: {r.details}</p>
          ) : null}

          <div className="mt-1 flex gap-2">
            <button
              onClick={() => resolve(r.id, "hide")}
              disabled={pendingId === r.id}
              className="rounded-full bg-signal-500 px-3 py-1 text-xs font-medium text-ink-950 hover:opacity-90 disabled:opacity-40"
            >
              {r.video ? "Remove video" : "Hide comment"}
            </button>
            <button
              onClick={() => resolve(r.id, "dismiss")}
              disabled={pendingId === r.id}
              className="rounded-full border border-ink-800 px-3 py-1 text-xs font-medium text-paper-100/70 hover:text-paper-100 disabled:opacity-40"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
