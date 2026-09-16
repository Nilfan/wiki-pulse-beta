import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db";
import { FEED_WINDOW_MS } from "@/lib/queries/constants";

/** Upper bound on a snapshot, in case traffic spikes far above the norm. */
const FEED_MAX_EVENTS = 500;

/** Snapshots taken within the same slot share a cache entry. */
const FEED_ALIGNMENT_MS = 10 * 1000;

export type FeedEvent = {
  id: string;
  timestamp: number;
  type: string;
  path: string;
  country: string | null;
};

export type FeedSnapshot = {
  /** Events of the last {@link FEED_WINDOW_MS}, oldest first. */
  events: FeedEvent[];
  /** Every event ever tracked, including the ones above. */
  total: number;
  fetchedAt: number;
};

async function getFeedSnapshotAt(untilMs: number): Promise<FeedSnapshot> {
  "use cache";

  cacheTag("events");
  cacheLife("seconds");

  const [rows, total] = await Promise.all([
    prisma.event.findMany({
      where: {
        timestamp: {
          gt: new Date(untilMs - FEED_WINDOW_MS),
          lte: new Date(untilMs),
        },
      },
      orderBy: { timestamp: "desc" },
      take: FEED_MAX_EVENTS,
      select: {
        id: true,
        timestamp: true,
        type: true,
        path: true,
        country: true,
      },
    }),
    prisma.event.count({
      where: { timestamp: { lte: new Date(untilMs) } },
    }),
  ]);

  return {
    events: rows.reverse().map((row) => ({
      id: row.id.toString(),
      timestamp: row.timestamp.getTime(),
      type: row.type,
      path: row.path,
      country: row.country,
    })),
    total,
    fetchedAt: untilMs,
  };
}

export function getFeedSnapshot(): Promise<FeedSnapshot> {
  const untilMs =
    Math.floor(Date.now() / FEED_ALIGNMENT_MS) * FEED_ALIGNMENT_MS;

  return getFeedSnapshotAt(untilMs);
}
