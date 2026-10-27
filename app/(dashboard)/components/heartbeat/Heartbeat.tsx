import { connection } from "next/server";
import { getHeartbeat } from "@/lib/api/data";
import HeartbeatBadge from "./HeartbeatBadge";

/** First reading only; useHeartbeat polls for the next ones. */
export default async function Heartbeat() {
  await connection();
  const heartbeat = await getHeartbeat();

  return <HeartbeatBadge initialHeartbeat={heartbeat} />;
}
