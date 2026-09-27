"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="hidden h-9 w-56 shrink-0 items-center gap-2 rounded-full border border-ink-800 bg-ink-900 px-3 focus-within:border-marquee-500 sm:flex"
    >
      <Search size={14} className="shrink-0 text-paper-100/40" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search videos"
        className="w-full bg-transparent text-sm leading-none text-paper-100 placeholder:text-paper-100/40 focus:outline-none"
      />
    </form>
  );
}
