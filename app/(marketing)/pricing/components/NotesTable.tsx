
const NOTES = [
  {
    title: "Going over the limit",
    content:
      "Nothing gets dropped and nothing auto-charges. We email you, and you decide whether to move up a plan.",
  },
  {
    title: "Changing plans",
    content:
      "Switch or cancel from the dashboard at any time. Downgrades take effect at the end of the month you've paid for.",
  },
  {
    title: "Leaving",
    content:
      "Export everything you've sent as CSV before you go. Cancelled accounts keep their data readable for 60 days.",
  },
];

export const NotesTable = () => (
  <div className="px-0 pt-[clamp(34px,4vw,56px)] pb-[clamp(48px,6vw,80px)] grid grid-cols-1 min-[901px]:grid-cols-3 gap-[clamp(20px,3vw,44px)]">
    {NOTES.map(({ content, title }, i) => (
      <div key={i}>
        <h3
          className="font-display font-medium text-[13px] tracking-[-0.04em] mx-0 mt-0 mb-2"
        >
          {title}
        </h3>
        <p className="m-0 text-[14px] text-ink-soft">{content}</p>
      </div>
    ))}
  </div>
);
