import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getHeartbeat, type Heartbeat } from "@/lib/queries/heartbeat";
import { getWikiOrgId } from "@/lib/queries/organizations";

export type HeartbeatResponse = Heartbeat;

/** Polled by the header heartbeat every few minutes; see useHeartbeat. */
export async function GET() {
  await connection();
  const wikiOrgId = await getWikiOrgId();

  const body: HeartbeatResponse = await getHeartbeat(wikiOrgId.toString());

  return NextResponse.json(body);
}
