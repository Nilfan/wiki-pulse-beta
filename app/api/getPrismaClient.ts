import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

let prismaClient: PrismaClient;

export function getPrismaClient() {
  if (prismaClient === undefined) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    prismaClient = new PrismaClient({ adapter });
  }

  return prismaClient;
}
