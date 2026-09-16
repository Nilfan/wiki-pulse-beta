import { WIKI_ORG } from "@/prisma/constants";
import { prisma } from "@/lib/db";

export async function getWikiOrgId(): Promise<bigint> {
  const wikiOrg = await prisma.organization.findFirst({
    where: {
      name: WIKI_ORG.name,
    },
    select: {
      id: true,
    },
  });

  if (!wikiOrg) {
    throw new Error("Wikipedia organization must be defined");
  }

  return wikiOrg.id;
}
