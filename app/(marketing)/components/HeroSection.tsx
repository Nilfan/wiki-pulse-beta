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
          gap-[clamp(32px, 5vw, 72px)]
          px-gut
          min-[901px]:grid-cols-[minmax(0,1fr)_minmax(0,420px)]
        "
    >
      <div>
        <p
          className="mb-4.5 font-display text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-soft"
        >
          Product analytics
        </p>
        <h1
          className="mb-5.5 max-w-[15ch] font-display text-[clamp(27px,3.5vw,45px)] leading-[1.12] font-bold tracking-[-0.075em]"
        >
          Every event, in the order it{" "}
          <em className="not-italic text-signal">happened</em>.
        </h1>
        <p
          className="font-body m-0 max-w-[46ch] text-[clamp(16px,1.5vw,18px)] text-ink-soft"
        >
          One script tag. Events land indexed by type, path and host — so the
          questions you actually ask stay fast at a million rows.
        </p>
        <div className="flex flex-wrap gap-3 mt-7.5">
          <button
            className="font-data inline-block border border-ink bg-ink px-5 py-3 text-[13px] text-paper hover:border-signal hover:bg-signal"
          >
            Start tracking
          </button>
          <button
            className="font-data
                    inline-block
                    border border-ink
                    bg-transparent
                    px-5 py-3
                    text-[13px]
                    text-ink 
                    hover:bg-shell"
          >
            See a live dashboard
          </button>
        </div>
        <p
          className="font-data mt-6.5 text-[11.5px] text-ink-faint tracking-[0.02em]"
        >
          No cookie banner required · Self-serve on the free tier
        </p>
      </div>

      <FeedBlock />
    </div>
  </section>
);
