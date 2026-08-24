import { PrismaClient } from "../generated/prisma/client.ts";
import { getPrismaClient } from "./get-prisma-client.ts";

const CLEARANCE_DB_PERIOD_DAYS = 7;
const CLEARANCE_PERIOD_HOURS = 6;

class IntervalDbCleaner {
  cleanerInterval?: ReturnType<typeof setInterval>;
  prismaClient: PrismaClient = getPrismaClient();

  scheduleIntervalCleaning() {
    if (this.cleanerInterval) {
      clearInterval(this.cleanerInterval);
    }

    const intervalTimeout = CLEARANCE_PERIOD_HOURS * 1000 * 60 * 60;

    this.cleanerInterval = setInterval(() => {
      const periodStartDate = new Date(
        Date.now() - CLEARANCE_DB_PERIOD_DAYS * 24 * 60 * 60 * 1000,
      );
      this.prismaClient.event
        .count({
          where: {
            timestamp: {
              lt: periodStartDate,
            },
          },
        })
        .then((payload: { count: number }) => {
          console.log(
            `[IntervalDbCleaner] Removed rows count: ${payload?.count}`,
          );
        });
    }, intervalTimeout);
  }
}

export const intervalDbCleaner = new IntervalDbCleaner();
