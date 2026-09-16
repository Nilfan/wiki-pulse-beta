"use server";

import { updateTag } from "next/cache";
import { getWikiOrgId } from "@/lib/queries/organizations";

/**
 * Drops every cached query tagged with the org, so the next read goes to the
 * database instead of waiting out `cacheLife("minutes")`. `updateTag` rather
 * than `revalidateTag(tag, "max")`: the caller refetches straight after this
 * and needs the fresh result, not the stale one served while it rebuilds.
 */
export async function revalidateDashboardData() {
  const wikiOrgId = await getWikiOrgId();
  updateTag(`org:${wikiOrgId}`);
}
