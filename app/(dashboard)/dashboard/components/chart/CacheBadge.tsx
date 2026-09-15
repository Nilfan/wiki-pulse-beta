"use client";

import { useEffect, useState } from "react";

/**
 * Age of the series on screen. The window bound is floored to a shared slot
 * before it reaches the query, so this doubles as how stale the cached result
 * behind the chart can be.
 */
type Props = {
  untilMs: number;
  isLoading?: boolean;
};

const REFRESH_MS = 30_000;

function formatAge(ageMs: number) {
  const minutes = Math.max(0, Math.floor(ageMs / 60_000));
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

export default function CacheBadge({ untilMs, isLoading = false }: Props) {
  // Rendered empty on the server: the age depends on the current clock, which
  // would differ between the two passes and trip hydration.
  const [age, setAge] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setAge(formatAge(Date.now() - untilMs));
    update();

    const timer = setInterval(update, REFRESH_MS);
    return () => clearInterval(timer);
  }, [untilMs]);

  if (isLoading) {
    return (
      <span className="border border-hair px-2 py-1.5 font-data text-[11.5px] text-ink-3">
        updating…
      </span>
    );
  }

  return (
    <span className="border border-brand/45 px-2 py-1.5 font-data text-[11.5px] text-brand tabular-nums">
      cached{age ? ` · ${age}` : ""}
    </span>
  );
}
