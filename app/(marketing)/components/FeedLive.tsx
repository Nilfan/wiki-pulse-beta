"use client";

import {
  useEffect,
  useReducer,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { FEED_REFRESH_MS } from "@/lib/queries/constants";
import type { FeedEvent, FeedSnapshot } from "@/lib/queries/feed";
import { decodePath, removeWikiPart } from "@/lib/helpers/page-path";

/** Rows the feed keeps on screen; the oldest one leaves when a new one comes. */
const FEED_MAX_ROWS = 20;

const REVEAL_MIN_DELAY_MS = 1000;
const REVEAL_MAX_DELAY_MS = 3000;

type FeedRow = FeedEvent & {
  playbackId: string;
  /** When the row showed up; `null` for the rows present since the page opened. */
  shownAt: number | null;
};

type FeedState = {
  /** Newest first. */
  rows: FeedRow[];
  /** Events still waiting for their turn, oldest first. */
  queue: FeedEvent[];
  total: number;
  /** Stored events to cycle through when there are no new arrivals. */
  replay: FeedEvent[];
  /** Ids of the latest snapshot, so the next one only queues what is new. */
  seenIds: Set<string>;
  revealed: number;
};

type FeedAction =
  | { type: "reveal"; now: number }
  | { type: "merge"; snapshot: FeedSnapshot };

/** Start with stored rows, then continuously replay the database sample. */
function initFeedState(snapshot: FeedSnapshot): FeedState {
  return {
    rows: snapshot.events
      .slice(-FEED_MAX_ROWS)
      .reverse()
      .map((event) => ({ ...event, shownAt: null, playbackId: `initial-${event.id}` })),
    queue: [],
    replay: snapshot.events,
    total: snapshot.total,
    seenIds: new Set(snapshot.events.map((event) => event.id)),
    revealed: 0,
  };
}

function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case "reveal": {
      const [arrival, ...remaining] = state.queue;
      const next = arrival ?? state.replay[state.revealed % state.replay.length];
      if (!next) return state;
      const queue = arrival ? remaining : state.queue;

      return {
        ...state,
        rows: [{ ...next, shownAt: action.now, playbackId: `reveal-${state.revealed}` }, ...state.rows].slice(
          0,
          FEED_MAX_ROWS,
        ),
        queue,
        revealed: state.revealed + 1,
      };
    }
    case "merge": {
      const { snapshot } = action;
      const unseen = snapshot.events.filter(
        (event) => !state.seenIds.has(event.id),
      );

      return {
        ...state,
        queue: [...state.queue, ...unseen],
        total: snapshot.total,
        replay: snapshot.events.length > 0 ? snapshot.events : state.replay,
        seenIds: new Set(snapshot.events.map((event) => event.id)),
      };
    }
  }
}

const subscribeNever = () => () => {};

/** False while rendering on the server and hydrating, true afterwards. */
const useIsClient = () =>
  useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

const randomRevealDelay = () =>
  REVEAL_MIN_DELAY_MS +
  Math.random() * (REVEAL_MAX_DELAY_MS - REVEAL_MIN_DELAY_MS);

export const FeedLive = ({ snapshot }: { snapshot: FeedSnapshot }) => {
  const [state, dispatch] = useReducer(feedReducer, snapshot, initFeedState);
  const [openedAt] = useState(Date.now);
  const isClient = useIsClient();

  const hasPlayback = state.queue.length > 0 || state.replay.length > 0;
  useEffect(() => {
    if (!hasPlayback) return;

    const timeout = setTimeout(
      () => dispatch({ type: "reveal", now: Date.now() }),
      randomRevealDelay(),
    );
    return () => clearTimeout(timeout);
  }, [hasPlayback, state.revealed]);

  useEffect(() => {
    let controller: AbortController | null = null;

    const refresh = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch("/api/feed", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;

        const snapshot: FeedSnapshot = await response.json();
        dispatch({ type: "merge", snapshot });
      } catch {
        // Continue replaying stored events; the next interval tries again.
      }
    };

    const interval = setInterval(refresh, FEED_REFRESH_MS);
    return () => {
      clearInterval(interval);
      controller?.abort();
    };
  }, []);

  return (
    <>
      <FeedList
        rows={state.rows}
        // Times are local to the viewer, so they only render after hydration.
        openedAt={isClient ? openedAt : null}
      />
      <FeedFooter>
        <span className="font-bold text-[clamp(21px,2.4vw,27px)] tracking-[-0.02em] tabular-nums">
          {state.total.toLocaleString("en-US")}
        </span>
      </FeedFooter>
    </>
  );
};

export const FeedFooter = ({ children }: { children: ReactNode }) => (
  <div className="font-data px-3 py-3.5 border-t border-t-rule flex items-baseline gap-2.5">
    {children}
    <span className="text-[11px] text-ink-soft">events tracked</span>
    <span className="text-[10.5px] text-ink-soft ml-auto">
      refreshed every 5 min
    </span>
  </div>
);

const getTwoDigits = (num: number) => `${num}`.padStart(2, "0");

const getTime = (timestamp: number) => {
  const date = new Date(timestamp);

  return `${getTwoDigits(date.getHours())}:${getTwoDigits(date.getMinutes())}:${getTwoDigits(date.getSeconds())}`;
};

const FeedList = ({
  rows,
  openedAt,
}: {
  rows: FeedRow[];
  openedAt: number | null;
}) => {
  return (
    <div className="h-75.5 overflow-hidden relative">
      {rows.map((row) => (
        <div
          key={row.playbackId}
          className="font-data animate-feed-row-slidein grid grid-cols-[60px_74px_1fr_30px] gap-2 items-center px-3 py-1.75 border-b border-b-[#EDEFEA] text-[11.5px] whitespace-nowrap"
        >
          <span className="text-ink-faint tabular-nums">
            {openedAt === null ? (
              <span className="invisible">00:00:00</span>
            ) : (
              getTime(row.shownAt ?? openedAt)
            )}
          </span>
          <span className="text-[10px] tracking-[0.03em] px-1.5 py-0.5 text-center border border-rule text-ink-soft">
            {row.type}
          </span>
          <span className="overflow-hidden text-ellipsis text-ink">
            {decodePath(removeWikiPart(row.path))}
          </span>
          <span className="text-ink-faint text-right">{row.country}</span>
        </div>
      ))}
    </div>
  );
};
