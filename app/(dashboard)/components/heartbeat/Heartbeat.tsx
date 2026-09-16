import { connection } from "next/server";
import { getHeartbeat } from "@/lib/queries/heartbeat";
import { getWikiOrgId } from "@/lib/queries/organizations";
import HeartbeatBadge from "./HeartbeatBadge";

/** First reading only; useHeartbeat polls for the next ones. */
export default async function Heartbeat() {
  await connection();
  const wikiOrgId = await getWikiOrgId();
  const heartbeat = await getHeartbeat(wikiOrgId.toString());

  return <HeartbeatBadge initialHeartbeat={heartbeat} />;
}
