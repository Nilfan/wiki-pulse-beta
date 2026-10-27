import { revalidateTag } from "next/cache";
import { getWikiOrgId } from "@/lib/queries/organizations";

export async function POST() {
  const orgId = await getWikiOrgId();
  revalidateTag(`org:${orgId}`, { expire: 0 });
  return Response.json({ ok: true });
}
