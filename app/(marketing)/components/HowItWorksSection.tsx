const STEPS = [
  {
    title: "Listen to the stream",
    description:
      "A background collector connects to Wikimedia’s public RecentChanges stream using Server-Sent Events (SSE).",
  },
  {
    title: "Sample and store",
    description:
      "The collector samples incoming events and saves them in batches every five minutes. Events are kept for 21 days.",
  },
  {
    title: "Build brief analytics",
    description:
      "The dashboard turns stored events into totals, trends and breakdowns, with filters to explore the activity that interests you.",
  },
];

export const HowItWorksSection = () => (
  <section
    id="how-it-works"
    aria-labelledby="how-it-works-title"
    className="mx-0 mt-0 mb-[clamp(48px,6vw,80px)] scroll-mt-24"
  >
    <div className="max-w-maxw mx-auto px-gut">
      <div className="border border-ink bg-ink text-paper p-[clamp(22px,3vw,34px)]">
        <h2
          id="how-it-works-title"
          className="font-display font-medium text-[clamp(16px,2vw,21px)] tracking-[-0.06em] mb-3"
        >
          From a live stream to a quick overview
        </h2>
        <p className="text-[#A9AFB4] text-[14.5px] mb-7 max-w-[68ch]">
          A small project following Wikipedia activity. The charts describe the
          collected sample, rather than the full volume of Wikipedia changes.
        </p>
        <ol className="grid grid-cols-1 gap-7 min-[901px]:grid-cols-3">
          {STEPS.map(({ title, description }, index) => (
            <li key={title} className="border-t border-[#4A5158] pt-4">
              <span className="font-data text-[11px] text-[#8FA6FF]">
                0{index + 1}
              </span>
              <h3 className="font-display text-[14px] mt-3 mb-2">{title}</h3>
              <p className="text-[14px] text-[#A9AFB4]">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  </section>
);
