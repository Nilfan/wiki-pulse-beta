import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { log } from "./wiki-source-service-helpers.ts";

const LOCAL_PG_URL = "postgresql://postgres:postgres@localhost:5432/nextjs_dev";

type PrismaClientGetterInput = { forceDevDB?: boolean };

export function getPrismaClient(config: PrismaClientGetterInput = {}) {
  const pgUrl =
    config.forceDevDB || !process.env.DATABASE_URL
      ? LOCAL_PG_URL
      : process.env.DATABASE_URL;

  const isLocal = pgUrl === LOCAL_PG_URL;
  const isLocalLabel = isLocal ? "local" : "env/prod";
  log(`PG_URL: ${isLocalLabel} url`);
  // Respect URL SSL options and pg environment defaults, as the app does.
  const pool = new Pool({ connectionString: pgUrl });
  const adapter = new PrismaPg(pool);
  const prismaClient = new PrismaClient({ adapter });

  return prismaClient;
}
