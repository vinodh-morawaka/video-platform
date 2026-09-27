"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";

function CopyableField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [revealed, setRevealed] = useState(!secret);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-paper-100/70">{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-900 px-3 py-2">
        <code className="flex-1 overflow-x-auto whitespace-nowrap text-sm text-paper-100">
          {revealed ? value : "•".repeat(24)}
        </code>
        {secret ? (
          <button
            onClick={() => setRevealed((r) => !r)}
            className="shrink-0 text-paper-100/50 hover:text-paper-100"
            aria-label={revealed ? "Hide" : "Show"}
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : null}
        <button
          onClick={handleCopy}
          className="shrink-0 text-paper-100/50 hover:text-paper-100"
          aria-label="Copy"
        >
          {copied ? <Check size={16} className="text-moss-500" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function StreamCredentials({ rtmpUrl, streamKey }: { rtmpUrl: string; streamKey: string }) {
  return (
    <div className="flex flex-col gap-4">
      <CopyableField label="Server / RTMP URL" value={rtmpUrl} />
      <CopyableField label="Stream key" value={streamKey} secret />
      <p className="text-xs text-signal-500">
        Keep your stream key private — anyone who has it can broadcast to your channel.
      </p>
    </div>
  );
}
