const GRID_BLOCKS = [
  {
    topic: "01 / activity",
    title: "See the pace of change",
    content:
      "Get a quick overview of collected events, active wikis and pages. Chart activity over time to see how the stream changes throughout the day.",
  },
  {
    topic: "02 / breakdowns",
    title: "Find the details that matter",
    content:
      "Filter by time range and event type, then group by event, page or wiki language. Switch between chart views to compare activity from different angles.",
  },
  {
    topic: "03 / recent events",
    title: "Look behind the numbers",
    content:
      "Browse the recent event feed alongside the summaries. See the page, event type and wiki language behind each collected change.",
  },
];

export const FeaturesSection = () => (
  <section className="py-[clamp(44px,6vw,72px)]">
    <div className="max-w-maxw my-0 mx-auto py-0 px-gut">
      <div className="grid grid-cols-1 min-[901px]:grid-cols-3 gap-0 border-t border-t-rule [&>*:first-child]:pl-0 [&>*:last-child]:border-r-0 [&>*:last-child]:pr-0">
        {GRID_BLOCKS.map(({ title, topic, content }) => (
          <div
            key={title}
            className="pt-6.5 pb-7.5 px-6.5 border-b border-b-rule border-r border-r-rule "
          >
            <p
              className="font-data text-[11px] text-signal tracking-[0.03em] mx-0 mt-0 mb-3"
            >
              {topic}
            </p>
            <h2
              className="font-display font-medium text-[15px] tracking-tighter mx-0 mt-0 mb-2.25 leading-[19.5px]"
            >
              {title}
            </h2>
            <p className="m-0 text-[14.5px] text-ink-soft leading-[21.75px]">
              {content}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
