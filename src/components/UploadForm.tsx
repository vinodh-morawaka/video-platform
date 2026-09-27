"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as UpChunk from "@mux/upchunk";

export default function UploadForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Choose a video file first.");
      return;
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          tags: tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to start upload");
      }
      const { videoId, uploadUrl } = await res.json();

      setProgress(0);
      const upload = UpChunk.createUpload({ endpoint: uploadUrl, file });
      upload.on("progress", (p) => setProgress(p.detail));
      upload.on("error", (err) => setError(err.detail.message));
      upload.on("success", () => {
        router.push(`/watch/${videoId}`);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-paper-100">Upload a video</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-paper-100/70">Title</label>
          <input
            className="rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-sm text-paper-100 focus:border-marquee-500 focus:outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-paper-100/70">Description</label>
          <textarea
            className="rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-sm text-paper-100 focus:border-marquee-500 focus:outline-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-paper-100/70">Tags</label>
          <input
            className="rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-sm text-paper-100 focus:border-marquee-500 focus:outline-none"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="comma, separated, tags"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-paper-100/70">Video file</label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-paper-100/70"
            required
          />
        </div>

        {progress !== null ? (
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-900">
            <div
              className="h-full bg-marquee-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}

        {error ? <p className="text-sm text-signal-500">{error}</p> : null}

        <button
          type="submit"
          className="rounded-full bg-marquee-500 px-4 py-2 text-sm font-medium text-ink-950 hover:bg-marquee-600 disabled:opacity-50"
          disabled={progress !== null && progress < 100}
        >
          {progress !== null ? "Uploading…" : "Upload"}
        </button>
      </form>
    </div>
  );
}
