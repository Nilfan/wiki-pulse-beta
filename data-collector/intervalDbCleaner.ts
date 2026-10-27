import type { PrismaClient } from "../generated/prisma/client.ts";
import { CLEARANCE_DB_PERIOD_DAYS, CLEARANCE_PERIOD_HOURS } from "../lib/collector-config.ts";

export class IntervalDbCleaner {
  cleanerInterval?: ReturnType<typeof setInterval>;
  private running = false;

  /** Cleanup must use exactly the same database as ingestion. */
  constructor(private readonly prismaClient: Pick<PrismaClient, "event">) {}

  async clean(nowMs = Date.now()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const cutoff = new Date(nowMs - CLEARANCE_DB_PERIOD_DAYS * 86400000);
      const { count } = await this.prismaClient.event.deleteMany({
        where: { timestamp: { lt: cutoff } },
      });
      console.log(`[IntervalDbCleaner] Removed rows count: ${count}`);
    } catch (error) {
      console.error("[IntervalDbCleaner] Cleanup failed; will retry at the next scheduled interval", error);
    } finally {
      this.running = false;
    }
  }

  scheduleIntervalCleaning() {
    if (this.cleanerInterval) clearInterval(this.cleanerInterval);
    this.cleanerInterval = setInterval(() => {
      void this.clean();
    }, CLEARANCE_PERIOD_HOURS * 60 * 60 * 1000);
  }
}
