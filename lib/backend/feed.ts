import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getFeedSnapshot, type FeedSnapshot } from "@/lib/queries/feed";

export type FeedResponse = FeedSnapshot;

/** Fresh snapshot for the landing feed, polled once per refresh interval. */
export async function GET() {
  await connection();

  const body: FeedResponse = await getFeedSnapshot();

  return NextResponse.json(body);
}
