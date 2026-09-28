"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-fetches the server-rendered page on an interval so a video that is
// LIVE or PROCESSING updates itself (LIVE badge → "processing" → playable)
// without the viewer reloading. Render it only while the video is in one of
// those states: once it's ready the page stops rendering this component and
// the polling stops with it. Client state (a half-typed comment, a playing
// live stream) is preserved across router.refresh().
export default function AutoRefresh({ intervalMs = 10_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      // Don't poll from a background tab.
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
