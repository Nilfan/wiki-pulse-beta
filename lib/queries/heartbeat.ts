import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db";

/**
 * Ingestion health for the dashboard header. Org-wide on purpose: it answers
 * "is data still coming in", which filters have no say in.
 */
export type Heartbeat = {
  /** Newest event of the org, epoch milliseconds; null before the first one. */
  lastEventMs: number | null;
  /** When the check ran, on the same clock as lastEventMs. */
  checkedAtMs: number;
};

/** One index lookup on (org_id, timestamp). */
async function getLastEventMs(orgId: string): Promise<number | null> {
  "use cache";
  cacheLife("seconds");
  cacheTag(`org:${orgId}`);

  const lastEvent = await prisma.event.findFirst({
    where: { org_id: BigInt(orgId) },
    orderBy: { timestamp: "desc" },
    select: { timestamp: true },
  });

  return lastEvent?.timestamp.getTime() ?? null;
}

export async function getHeartbeat(orgId: string): Promise<Heartbeat> {
  const lastEventMs = await getLastEventMs(orgId);

  // Taken after the lookup so a cached lastEventMs still reads its real age.
  return { lastEventMs, checkedAtMs: Date.now() };
}
