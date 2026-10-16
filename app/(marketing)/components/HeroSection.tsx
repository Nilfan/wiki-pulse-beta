import Link from "next/link";
import { FeedBlock } from "./FeedBlock";

export const HeroSection = () => (
  <section className="pt-[clamp(48px,7vw,92px)] pb-[clamp(40px,5vw,64px)]">
    <div
      className="
          grid 
          mx-auto
          max-w-maxw
          grid-cols-1
          items-start
          gap-[clamp(32px,5vw,72px)]
          px-gut
          min-[901px]:grid-cols-[minmax(0,1fr)_minmax(0,420px)]
        "
    >
      <div>
        <p
          className="mb-4.5 font-display text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-soft"
        >
          Wikipedia event analytics
        </p>
        <h1
          className="mb-5.5 max-w-[15ch] font-display text-[clamp(27px,3.5vw,45px)] leading-[1.12] font-bold tracking-[-0.075em]"
        >
          Wikipedia in motion.
          <br />
          <em className="not-italic text-signal">A clearer picture.</em>
        </h1>
        <p
          className="font-body m-0 max-w-[46ch] text-[clamp(16px,1.5vw,18px)] text-ink-soft"
        >
          Wiki Pulse collects Wikipedia events from Wikimedia’s live
          Server-Sent Events (SSE) stream and turns them into brief analytics.
          Explore recent activity, event types, pages and wiki languages in one
          dashboard.
        </p>
        <div className="flex flex-wrap gap-3 mt-7.5">
          <Link
            href="/dashboard"
            className="font-data
                    inline-block
                    border border-ink
                    bg-ink
                    px-5 py-3
                    text-[13px]
                    text-paper
                    hover:bg-signal"
          >
            Open dashboard
          </Link>
          <Link
            href="/flow"
            className="font-data inline-block border border-ink px-5 py-3 text-[13px] hover:bg-shell"
          >
            How it works
          </Link>
        </div>
        <p
          className="font-data mt-6.5 text-[11.5px] text-ink-faint tracking-[0.02em]"
        >
          Sampled stream · Batched every 5 minutes · 21-day retention
        </p>
      </div>

      <FeedBlock />
    </div>
  </section>
);
