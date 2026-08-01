import { jetBrainsMono, martianMono } from "@/app/fonts";
import clsx from "clsx";

const GRID_BLOCKS = [
  {
    topic: "type · path · host",
    title: "Three axes, always indexed",
    content:
      "What happened, where it happened, and on which domain — stored as real columns, not buried in a JSON blob. Top pages and funnels stay quick as the table grows.",
  },
  {
    topic: "properties",
    title: "Room for the odd question",
    content:
      "Attach anything else you need per event. It's there when you dig into one account, and it never slows down the charts everyone looks at daily.",
  },
  {
    topic: "stream",
    title: "Watch it arrive",
    content:
      "Ship a change and see the events land, live, while the rest of the dashboard stays put. Useful the moment you're checking whether tracking actually works.",
  },
];

export const FeetSection = () => (
  <section className="py-[clamp(44px,6vw,72px)]">
    <div className="max-w-maxw my-0 mx-auto py-0 px-gut">
      <div className="grid grid-cols-1 min-[901px]:grid-cols-3 gap-0 border-t border-t-rule [&>*:first-child]:pl-0 [&>*:last-child]:border-r-0 [&>*:last-child]:pr-0">
        {GRID_BLOCKS.map(({ title, topic, content }) => (
          <div
            key={title}
            className="pt-6.5 pb-7.5 px-6.5 border-b border-b-rule border-r border-r-rule "
          >
            <p
              className={clsx(
                jetBrainsMono.className,
                "text-[11px] text-signal tracking-[0.03em] mx-0 mt-0 mb-3",
              )}
            >
              {topic}
            </p>
            <h3
              className={clsx(
                martianMono.className,
                "font-medium text-[15px] tracking-tighter mx-0 mt-0 mb-2.25 leading-[19.5px]",
              )}
            >
              {title}
            </h3>
            <p className="m-0 text-[14.5px] text-ink-soft leading-[21.75px]">
              {content}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
