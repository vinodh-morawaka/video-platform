"use client";

import { useState } from "react";

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Harassment or bullying",
  HATE_SPEECH: "Hate speech",
  COPYRIGHT: "Copyright infringement",
  SEXUAL_CONTENT: "Sexual content",
  VIOLENCE: "Violence",
  OTHER: "Other",
};

export default function ReportButton({
  videoId,
  commentId,
  alreadyReported,
  className,
}: {
  videoId?: string;
  commentId?: string;
  alreadyReported?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("SPAM");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Distinguishes "you already had one pending" (known before you even
  // opened the form, or discovered on submit) from "you just filed this
  // one" — same end state, but honest about which happened.
  const [status, setStatus] = useState<"already" | "reported" | null>(
    alreadyReported ? "already" : null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, commentId, reason, details: details || undefined }),
      });
      if (res.status === 409) {
        setStatus("already");
        setOpen(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit report");
      }
      setStatus("reported");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (status) {
    return (
      <span className={`text-xs text-paper-100/40 ${className ?? ""}`}>
        {status === "already" ? "Already reported — pending review" : "Reported"}
      </span>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-paper-100/50 hover:text-signal-500"
      >
        {open ? "Cancel" : "Report"}
      </button>
      {open ? (
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 rounded-lg border border-ink-800 bg-ink-900 p-3">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-md border border-ink-800 bg-ink-950 px-2 py-1.5 text-sm text-paper-100 focus:border-marquee-500 focus:outline-none"
          >
            {Object.entries(REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Anything else we should know? (optional)"
            rows={2}
            maxLength={1000}
            className="rounded-md border border-ink-800 bg-ink-950 px-2 py-1.5 text-sm text-paper-100 placeholder:text-paper-100/40 focus:border-marquee-500 focus:outline-none"
          />
          {error ? <p className="text-xs text-signal-500">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-fit rounded-full bg-signal-500 px-3 py-1 text-xs font-medium text-ink-950 hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? "Submitting…" : "Submit report"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
