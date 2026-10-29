import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";
import { WIKI_ORG } from "./constants";
import { buildLocalSeedEvents } from "./local-seed-data";

const launchedAt = new Date();

async function main() {
  const events = buildLocalSeedEvents(launchedAt);
  const times = events.map((event) => event.timestamp.getTime());
  const range = `${new Date(Math.min(...times)).toISOString()} – ${new Date(Math.max(...times)).toISOString()}`;
  if (process.argv.includes("--dry-run")) {
    console.log(`Validated ${events.length} fixture events: ${range}. No database writes.`);
    return;
  }

  // Deliberately independent of .env and production database configuration.
  const pool = new Pool({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/nextjs_dev",
    connectionTimeoutMillis: 5_000,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`TRUNCATE TABLE "Event" RESTART IDENTITY`;
      const org = await tx.organization.upsert({
        where: { slug: WIKI_ORG.slug },
        update: {},
        create: WIKI_ORG,
      });
      for (let offset = 0; offset < events.length; offset += 1000) {
        await tx.event.createMany({
          data: events.slice(offset, offset + 1000).map((event) => ({
            ...event,
            org_id: org.id,
          })),
        });
      }
      const count = await tx.event.count();
      const last = await tx.event.findFirst({ orderBy: { id: "desc" } });
      if (count !== events.length || last?.timestamp.getTime() !== launchedAt.getTime()) {
        throw new Error("Seed verification failed: row count or final timestamp differs");
      }
    }, { timeout: 30_000 });
    console.log(`Cleared local Event table and reset IDs. Seeded ${events.length} events: ${range}`);
    console.log(`Verified final row timestamp equals script launch: ${launchedAt.toISOString()}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
