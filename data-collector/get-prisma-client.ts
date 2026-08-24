import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { log } from "./wiki-source-service-helpers.ts";

const LOCAL_PG_URL = "postgresql://postgres:postgres@localhost:5432/nextjs_dev";

export function getPrismaClient() {
  const pgUrl = process.env.DATABASE_URL || LOCAL_PG_URL;

  const isLocal = pgUrl === LOCAL_PG_URL;
  const isLocalLabel = isLocal ? "local" : "env/prod";
  log(`PG_URL: ${isLocalLabel} url`);
  let pool: Pool;
  if (isLocal) {
    pool = new Pool({
      connectionString: pgUrl,
    });
  } else {
    pool = new Pool({
      connectionString: pgUrl,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }
  const adapter = new PrismaPg(pool);
  const prismaClient = new PrismaClient({ adapter });

  return prismaClient;
}
