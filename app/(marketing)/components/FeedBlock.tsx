import { connection } from "next/server";
import { Suspense } from "react";
import {
  FeedListSkeleton,
  TotalEventCountSkeleton,
} from "./FeedBlockSkeletons";
import { FeedFooter, FeedLive } from "./FeedLive";
import { PulseIcon } from "@/lib/components";
import { getFeedSnapshot } from "@/lib/queries/feed";

async function FeedEvents() {
  await connection();
  const snapshot = await getFeedSnapshot();

  return <FeedLive snapshot={snapshot} />;
}

export const FeedBlock = () => {
  return (
    <div className="border border-ink bg-shell">
      <div className="font-data flex items-center gap-2.25 px-3 py-2.25 border border-rule text-[11px] text-ink-soft">
        <PulseIcon mode={"Infinite"} /> LIVE
        <span className="ml-auto text-ink-faint">org: acme-inc</span>
      </div>
      <Suspense
        fallback={
          <>
            <FeedListSkeleton />
            <FeedFooter>
              <TotalEventCountSkeleton />
            </FeedFooter>
          </>
        }
      >
        <FeedEvents />
      </Suspense>
    </div>
  );
};
