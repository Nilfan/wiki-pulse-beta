import type { Metadata } from "next";
import Link from "next/link";
import {
  MAX_EVENTS_PER_ONE_MINUTE, BATCH_ADD_THROTTLE_MS, MAX_BATCH_CAPACITY, FLUSH_TIMEOUT_MS,
  CLEARANCE_DB_PERIOD_DAYS, CLEARANCE_PERIOD_HOURS,
} from "@/lib/collector-config";
import { MAX_SERIES } from "@/lib/queries/constants";
import { FlowMap } from "./FlowMap";

export const metadata: Metadata = {
  title: "Flow — Wiki Pulse",
  description: "Follow Wikimedia SSE events through sampling, filtering, batch storage and brief analytics in Wiki Pulse.",
};

export default function FlowPage() {
  const steps = [
    {
      title: "01 / Connect",
      text: "The Deno collector listens to Wikimedia’s public RecentChanges SSE stream. Each message carries a change type, page title, URL, wiki host and timestamp. The source can include Wikimedia projects beyond Wikipedia; the collector does not apply a Wikipedia-only host filter.",
    },
    {
      title: "02 / Reduce incoming volume",
      text: `The collector accepts the first valid event in each ${BATCH_ADD_THROTTLE_MS.toLocaleString("en-US")} ms time slot, targeting ${MAX_EVENTS_PER_ONE_MINUTE} events per minute while the stream is active. Empty slots stay empty; reconnecting does not trigger catch-up bursts. Sampling does not select topics or event types.`,
    },
    {
      title: "03 / Save a bounded batch",
      text: `Accepted events retain their source timestamp and are queued up to ${MAX_BATCH_CAPACITY} events. An independent timer writes the batch to PostgreSQL every ${FLUSH_TIMEOUT_MS / 60000} minutes, even if the stream is idle or reconnecting. Failed batches are retained for the next flush. The latest interval remains unavailable to analytics until it is saved.`,
    },
    {
      title: "04 / Explore the sample",
      text: `The dashboard queries stored events for the Wikipedia organization. Time, event type, page and wiki-language filters narrow the results; time buckets and grouping build the charts. Charts show up to ${MAX_SERIES} series. These display filters do not delete stored events. Totals describe the collected sample, not all changes on Wikipedia.`,
    },
    {
      title: "05 / Keep a rolling history",
      text: `A cleanup job runs every ${CLEARANCE_PERIOD_HOURS} hours and deletes events older than ${CLEARANCE_DB_PERIOD_DAYS} days. Older rows can remain until the next cleanup. Choosing a longer dashboard range cannot restore deleted history.`,
    },
  ];

  return (
    <div className="max-w-maxw mx-auto px-gut pt-[clamp(46px,6vw,80px)] pb-20">
      <p className="font-display text-[10.5px] uppercase tracking-[0.16em] text-ink-soft mb-5">Inside Wiki Pulse</p>
      <h1 className="font-display font-bold text-[clamp(28px,3.4vw,42px)] leading-tight tracking-[-0.075em] max-w-[22ch] mb-5">A stream of changes.<br /><span className="text-signal">A smaller, useful signal.</span></h1>
      <p className="max-w-[70ch] text-ink-soft mb-9">Follow the events from Wikimedia’s Server-Sent Events stream to brief analytics. The numbers below come from the same configuration used by the backend collector.</p>
      <FlowMap />
      <section aria-labelledby="pipeline-details" className="mt-12">
        <h2 id="pipeline-details" className="font-display text-xl mb-6">What happens at each step</h2>
        <div className="divide-y divide-rule border-y border-rule">
          {steps.map(({ title, text }) => (
            <article key={title} className="grid gap-3 py-6 md:grid-cols-[240px_1fr]">
              <h3 className="font-display text-sm">{title}</h3>
              <p className="text-sm text-ink-soft leading-relaxed">{text}</p>
            </article>
          ))}
        </div>
      </section>
      <div className="mt-8 flex flex-wrap items-center gap-5 text-sm">
        <Link href="/dashboard" className="border border-ink bg-ink text-paper px-5 py-3 hover:bg-signal">Explore the dashboard</Link>
        <a href="https://stream.wikimedia.org/v2/stream/recentchange" className="text-signal underline underline-offset-4">View the source stream</a>
      </div>
    </div>
  );
}
