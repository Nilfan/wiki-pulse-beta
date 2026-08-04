import { jetBrainsMono } from "@/app/fonts";
import clsx from "clsx";
import { PulseIcon } from "./PulseIcon";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { cacheLife, cacheTag } from "next/cache";
import { Suspense } from "react";
import {
  FeedListSkeleton,
  TotalEventCountSkeleton,
} from "./FeedBlockSkeletons";

type PreviewEventType = Pick<
  Prisma.EventModel,
  "id" | "timestamp" | "type" | "path" | "country"
>;

async function getLastNEvents(n = 20) {
  "use cache";

  cacheTag("events");
  cacheLife("hours");

  return await prisma.event.findMany({
    take: -n,
    orderBy: {
      timestamp: "desc",
    },
    select: {
      id: true,
      timestamp: true,
      type: true,
      path: true,
      country: true,
    },
  });
}

async function getEventsTotalCount() {
  "use cache";
  cacheTag("events");
  cacheLife("hours");

  return await prisma.event.count();
}

async function TotalEventCountLabel() {
  const eventCount = await getEventsTotalCount();
  const eventCountFormatted = eventCount ? eventCount.toLocaleString() : 0;

  return (
    <span className="font-bold text-[clamp(21px,2.4vw,27px)] tracking-[-0.02em] tabular-nums">
      {eventCountFormatted}
    </span>
  );
}

async function FeedEvents() {
  const events: PreviewEventType[] = await getLastNEvents();

  return <FeedList events={events} />;
}

export const FeedBlock = () => {
  return (
    <div className="border border-ink bg-shell">
      <div
        className={clsx(
          jetBrainsMono.className,
          "flex items-center gap-2.25 px-3 py-2.25 border border-rule text-[11px] text-ink-soft",
        )}
      >
        <PulseIcon mode={"Infinite"} /> LIVE
        <span className="ml-auto text-ink-faint">org: acme-inc</span>
      </div>
      <Suspense fallback={<FeedListSkeleton />}>
        <FeedEvents />
      </Suspense>
      <div
        className={clsx(
          jetBrainsMono.className,
          "px-3 py-3.5 border-t border-t-rule flex items-baseline gap-2.5",
        )}
      >
        <Suspense fallback={<TotalEventCountSkeleton />}>
          <TotalEventCountLabel />
        </Suspense>
        <span className="text-[11px] text-ink-soft">events tracked</span>
        <span className="text-[10.5px] text-ink-soft ml-auto">
          refreshed hourly
        </span>
      </div>
    </div>
  );
};

const getTwoDigits = (num: number) =>
  `${num}`.length < 2 ? `0${num}` : `${num}`;

const getTime = (date: Date) =>
  `${getTwoDigits(date.getHours())}:${getTwoDigits(date.getMinutes())}:${getTwoDigits(date.getSeconds())}`;

const FeedList = ({ events }: { events: PreviewEventType[] }) => {
  return (
    <div className="h-75.5 overflow-hidden relative">
      {events.map((event) => (
        <div
          key={event.id}
          className={clsx(
            jetBrainsMono.className,
            "animate-feed-row-slidein grid grid-cols-[60px_74px_1fr_30px] gap-2 items-center px-3 py-1.75 border-b border-b-[#EDEFEA] text-[11.5px] whitespace-nowrap",
          )}
        >
          <span className="text-ink-faint tabular-nums">
            {getTime(event.timestamp)}
          </span>
          <span className="text-[10px] tracking-[0.03em] px-1.5 py-0.5 text-center border border-rule text-ink-soft">
            {event.type}
          </span>
          <span className="overflow-hidden text-ellipsis text-ink">
            {event.path}
          </span>
          <span className="text-ink-faint text-right">{event.country}</span>
        </div>
      ))}
    </div>
  );
};
