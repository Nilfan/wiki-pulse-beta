export type PreviewEvent = {
  id: number;
  timestamp: Date;
  type: string;
  path: string;
  country: string;
};

type EventCardsProps = {
  events: PreviewEvent[];
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function EventCards({ events }: EventCardsProps) {
  return (
    <div className="flex gap-3 w-100 flex-col">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

const EventCard = ({ event }: { event: PreviewEvent }) => {
  const timestampDate = new Date(event.timestamp);

  return (
    <article
      key={event.id}
      className="rounded-xl border border-rule bg-shell p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-paper-deep px-2.5 py-1 text-xs font-medium text-ink">
          {event.type}
        </span>

        <p className="truncate text-sm font-medium text-ink" title={event.path}>
          {event.path}
        </p>

        <div className="w-15 flex flex-col text-xs text-ink-soft">
          <span>LG: {event.country}</span>
          <span>ID: #{event.id}</span>
        </div>

        <time
          className="text-xs tabular-nums text-ink-faint"
          dateTime={timestampDate.toISOString()}
        >
          {dateFormatter.format(timestampDate)}
        </time>
      </div>
    </article>
  );
};
