import { prisma } from "@/lib/db";

export function getPrismaClient() {
  return prisma;
}
