"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { RecentEvent } from "@/lib/queries/recentEvents";
import { formatGroupValue } from "./chart/chartSeries";

const TYPE_VIEW: Record<string, { label: string; color: string }> = {
  edit: { label: "Edit", color: "bg-[#1aa79a]" },
  new: { label: "New page", color: "bg-[#8b5cf6]" },
  categorize: { label: "Categorize", color: "bg-[#2b59e8]" },
  log: { label: "Log", color: "bg-[#a8b1c1]" },
};
const utcTime = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

function eventUrl(event: RecentEvent) {
  try {
    const url = new URL(event.path, event.host);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch { return undefined; }
}

export default function RecentEvents({ initialEvents, queryString }: { initialEvents: RecentEvent[]; queryString: string }) {
  const [state, setState] = useState({ events: initialEvents, queryString, error: false });
  const [expanded, setExpanded] = useState(false);
  const initialQuery = useRef(queryString);
  const isInitial = useRef(true);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(`/api/dashboard/recent?${queryString}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Recent events unavailable");
        const events: RecentEvent[] = await response.json();
        if (!controller.signal.aborted) setState({ events, queryString, error: false });
      } catch {
        if (!controller.signal.aborted) setState(current => ({ ...current, error: true }));
      }
    };
    const debounce = isInitial.current && initialQuery.current === queryString ? undefined : setTimeout(load, 350);
    isInitial.current = false;
    const refresh = setInterval(() => { if (document.visibilityState !== "hidden") void load(); }, 5 * 60 * 1000);
    return () => { controller.abort(); clearTimeout(debounce); clearInterval(refresh); };
  }, [queryString]);
  const isLoading = state.queryString !== queryString;
  return (
    <section id="recent-events" className="scroll-mt-6 rounded-[14px] border border-hair bg-white px-4 py-5 sm:px-5.5" aria-labelledby="recent-events-title">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="recent-events-title" className="text-lg font-semibold">Recent events</h2>
        <button type="button" onClick={() => setExpanded(value => !value)} className="py-2 text-sm font-semibold text-signal hover:underline">{expanded ? "Show fewer" : "View latest 50 →"}</button>
      </header>
      <p className="mb-3 text-xs text-ink-3">Newest stored events in the selected period. Times are UTC.</p>
      {state.error && <p role="status" className="mb-3 text-sm text-[#9a3d0e]">Couldn’t refresh recent events. Showing the previous results; refresh the page to retry.</p>}
      <div className={clsx("overflow-x-auto transition-opacity", isLoading && "opacity-45")} aria-busy={isLoading}>
        <table className="w-full min-w-140 border-collapse text-sm">
          <thead className="bg-paper text-left text-xs font-semibold tracking-[0.06em] text-ink-3"><tr>{["TIME (UTC)", "TYPE", "PAGE", "WIKI"].map(label => <th key={label} className="px-3 py-2.5">{label}</th>)}</tr></thead>
          <tbody>{state.events.slice(0, expanded ? 50 : 5).map(event => {
            const type = TYPE_VIEW[event.type] ?? { label: event.type, color: "bg-[#a8b1c1]" };
            return <tr key={event.id} className="border-t border-[#eef1f6]">
              <td className="px-3 py-3 [font-family:var(--font-jetbrains)] text-xs" title={event.timestamp}>{utcTime.format(new Date(event.timestamp))}</td>
              <td className="px-3 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><span aria-hidden className={`size-2 rounded-full ${type.color}`} />{type.label}</span></td>
              <td className="max-w-100 truncate px-3 py-3"><a className="text-signal hover:underline" href={eventUrl(event)} target="_blank" rel="noreferrer">{formatGroupValue("page", event.path)}</a></td>
              <td className="px-3 py-3 text-ink-soft">{event.host.replace(/^https?:\/\//, "").replace(/\/$/, "")}</td>
            </tr>;
          })}</tbody>
        </table>
        {!state.events.length && <p className="py-8 text-center text-sm text-ink-3">No events match this period and these filters.</p>}
      </div>
    </section>
  );
}
