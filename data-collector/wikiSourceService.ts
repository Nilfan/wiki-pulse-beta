/// <reference lib="deno.ns" />
import {
  MAX_BATCH_CAPACITY,
  BATCH_ADD_THROTTLE_MS,
  FLUSH_TIMEOUT_MS,
  FORCE_DEV_DB,
} from "../lib/collector-config.ts";

import { EventSource } from "eventsource";
import { WIKI_ORG } from "../prisma/constants.ts";
import { Prisma, PrismaClient } from "../generated/prisma/client.ts";

import { getLanguageFromServerUrl } from "./get-language-from-server-url.ts";
import {
  log,
  getErrorText,
  error,
  getTime,
} from "./wiki-source-service-helpers.ts";
import { getPrismaClient } from "./get-prisma-client.ts";

type WikiEvent = Pick<
  Prisma.EventCreateInput,
  "type" | "host" | "timestamp" | "path" | "country" | "properties"
>;

const EVENT_SOURCE_URL = "https://stream.wikimedia.org/v2/stream/recentchange";
const EVENT_IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 min
const HEALTH_CHECK_INTERVAL_MS = 15 * 1000; // 15 sec

export class WikiSourceService {
  prismaClient: PrismaClient;
  wikiOrg: Prisma.OrganizationCreateInput | null = null;
  eventSource?: EventSource;
  eventBatch: WikiEvent[] = [];
  private lastSampleSlot: number | undefined;
  private flushTimer?: ReturnType<typeof setInterval>;
  private pendingFlush?: Promise<void>;
  private retryBatch: WikiEvent[] = [];

  private reconnectAttempt = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private healthCheckTimer?: ReturnType<typeof setInterval>;
  private lastEventReceivedAt?: number;

  constructor(
    prismaClient = getPrismaClient({
      forceDevDB: FORCE_DEV_DB,
    }),
  ) {
    this.prismaClient = prismaClient;
  }

  openEventChannel() {
    log(`Open event channel, one sample per ${BATCH_ADD_THROTTLE_MS} ms slot`);
    const wikiOrgId = this.wikiOrg?.id;

    if (this.wikiOrg === null || !wikiOrgId) {
      throw new Error(
        getErrorText("Wiki org must be defined on channel opening"),
      );
    }

    if (this.eventSource) {
      this.closeEventChannel();
    }

    const eventSource = new EventSource(EVENT_SOURCE_URL, {
      fetch: async (input, init) => {
        const response = await fetch(input, {
          ...init,
          headers: {
            ...init?.headers,
          },
        });

        if (response.status === 429) {
          error("Rate limited", {
            retryAfter: response.headers.get("retry-after"),
            requestId: response.headers.get("x-request-id"),
          });
        }

        return response;
      },
    });
    this.eventSource = eventSource;
    this.lastEventReceivedAt = Date.now();
    this.startHealthCheck(eventSource);

    this.startFlushTimer();

    log(`Listen to event channel`);

    eventSource.onerror = (err) => {
      if (this.eventSource !== eventSource) {
        return;
      }

      error("SSE connection failed", {
        code: err.code,
        message: err.message,
        readyState: eventSource.readyState,
        reconnectAttempt: this.reconnectAttempt,
      });

      if (eventSource.readyState === EventSource.CLOSED) {
        this.scheduleReconnect();
      }
    };

    eventSource.onopen = () => {
      if (this.eventSource !== eventSource) {
        return;
      }

      log(`Connection reopened, attempt: ${this.reconnectAttempt}`);
      this.reconnectAttempt = 0;
      this.lastEventReceivedAt = Date.now();
    };

    eventSource.onmessage = (rawEvent) => {
      if (this.eventSource !== eventSource) {
        return;
      }

      this.lastEventReceivedAt = Date.now();
      try {
        this.addEventToBatchOnMessage(rawEvent);
      } catch (err) {
        error("Invalid stream event", err);
      }
    };
  }

  private startFlushTimer() {
    this.flushTimer ??= setInterval(() => {
      void this.flushBatch().catch((err) =>
        error("Error on flush events", err),
      );
    }, FLUSH_TIMEOUT_MS);
  }

  flushBatch(): Promise<void> {
    if (this.pendingFlush) return this.pendingFlush;
    const orgId = this.wikiOrg?.id;
    if (!orgId)
      return Promise.reject(
        new Error(getErrorText("Wiki org must be defined on flush")),
      );

    // Keep a failed write separate so collection can continue at its normal cadence.
    const events = [...this.retryBatch, ...this.eventBatch];
    if (events.length === 0) return Promise.resolve();
    this.retryBatch = [];
    this.eventBatch = [];
    log(`Flush ${events.length} events: ${getTime(new Date())}`);
    this.pendingFlush = this.flushEvents(orgId, events)
      .catch((err) => {
        this.retryBatch = events;
        throw err;
      })
      .finally(() => {
        this.pendingFlush = undefined;
      });
    return this.pendingFlush;
  }

  private addEventToBatchOnMessage(rawEvent: MessageEvent) {
    const sampleSlot = Math.floor(Date.now() / BATCH_ADD_THROTTLE_MS);
    if (
      sampleSlot === this.lastSampleSlot ||
      this.eventBatch.length >= MAX_BATCH_CAPACITY
    )
      return;

    const {
      type,
      title,
      title_url,
      server_url,
      meta,
      dt,
      timestamp: unixTimestamp,
    } = JSON.parse(rawEvent.data);

    const timestamp = new Date(meta?.dt ?? dt ?? unixTimestamp * 1000);
    if (!Number.isFinite(timestamp.getTime()))
      throw new Error("Missing or invalid event timestamp");
    const path = title_url.replace(server_url, "");
    const country = getLanguageFromServerUrl(server_url);

    const properties = JSON.stringify({ title });
    const event: WikiEvent = {
      type,
      properties,
      path,
      host: server_url,
      country,
      timestamp,
    };

    this.eventBatch.push(event);
    this.lastSampleSlot = sampleSlot;
    log(`Add to batch: ${this.eventBatch.length}/${MAX_BATCH_CAPACITY}`);
  }

  private async flushEvents(orgId: number | bigint, events: WikiEvent[]) {
    const eventInstants: Prisma.EventUncheckedCreateInput[] = events.map(
      (event) => ({
        ...event,
        org_id: orgId,
      }),
    );

    await this.prismaClient.event.createMany({
      data: eventInstants,
    });
  }

  closeEventChannel() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }

    this.lastEventReceivedAt = undefined;
  }

  async init() {
    await this.initWikiOrg();
    this.subscribeDenoSignal();
  }

  async initWikiOrg() {
    this.wikiOrg = await this.prismaClient.organization.findFirst({
      where: {
        name: WIKI_ORG.name,
      },
    });
  }

  subscribeDenoSignal() {
    const shutdown = async () => {
      this.closeEventChannel();
      if (this.flushTimer) clearInterval(this.flushTimer);
      try {
        await this.pendingFlush;
        await this.flushBatch();
        await this.prismaClient.$disconnect();
        Deno.exit(0);
      } catch (err) {
        error("Shutdown flush failed", err);
        Deno.exit(1);
      }
    };
    Deno.addSignalListener("SIGINT", shutdown);
    Deno.addSignalListener("SIGTERM", shutdown);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }

    this.closeEventChannel();

    const baseDelay = 5 * 1000; // 5 sec
    const maxDelay = 5 * 60 * 1000; // 5 min

    const exponentialDelay = Math.min(
      baseDelay * 2 ** this.reconnectAttempt,
      maxDelay,
    );

    const jitter = Math.floor(Math.random() * 1000);

    const delay = exponentialDelay + jitter;

    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.openEventChannel();
    }, delay);
  }

  private startHealthCheck(eventSource: EventSource) {
    this.healthCheckTimer = setInterval(() => {
      if (
        this.eventSource !== eventSource ||
        this.lastEventReceivedAt === undefined
      ) {
        return;
      }

      const idleTime = Date.now() - this.lastEventReceivedAt;

      if (idleTime <= EVENT_IDLE_TIMEOUT_MS) {
        return;
      }

      error("SSE event stream is stale, recreating connection", {
        idleTime,
        readyState: eventSource.readyState,
      });

      this.openEventChannel();
    }, HEALTH_CHECK_INTERVAL_MS);
  }
}
