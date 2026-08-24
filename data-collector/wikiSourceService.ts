/// <reference lib="deno.ns" />

import { EventSource } from "eventsource";
import { WIKI_ORG } from "../prisma/constants.ts";
import { Prisma, PrismaClient } from "../generated/prisma/client.ts";

import { getLanguageFromServerUrl } from "./get-language-from-server-url.ts";
import { oneIn } from "./random-int.ts";
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
const SAMPLE_RATE = 30;
const MAX_BATCH_CAPACITY = 200;
const BATCH_ADD_THROTTLE_MS = 1700; // ~ 1000/0.6ms
const FLUSH_TIMEOUT_MS = 5 * 60 * 1000; // 5 min
const EVENT_IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 min
const HEALTH_CHECK_INTERVAL_MS = 15 * 1000; // 15 sec

class WikiSourceService {
  prismaClient: PrismaClient;
  wikiOrg: Prisma.OrganizationCreateInput | null = null;
  eventSource?: EventSource;
  eventBatch: WikiEvent[] = [];
  lastFlushTime: number | undefined;
  lastBatchAddTime: number | undefined;

  private reconnectAttempt = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private healthCheckTimer?: ReturnType<typeof setInterval>;
  private lastEventReceivedAt?: number;

  constructor() {
    this.prismaClient = getPrismaClient();
  }

  openEventChannel() {
    log(`Open event channel, sample rate 1/${SAMPLE_RATE}`);
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

    this.lastFlushTime ??= Date.now();

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
      this.flushEventsOnMessage();
      this.addEventToBatchOnMessage(rawEvent);
    };
  }

  private flushEventsOnMessage() {
    if (this.lastFlushTime === undefined) {
      throw new Error(getErrorText("lastFlushTime must be defined"));
    }

    const wikiOrgId = this.wikiOrg?.id;

    if (!wikiOrgId) {
      throw new Error(getErrorText("Wiki org must be defined on flush"));
    }

    const isFlushTimeoutHappen =
      Date.now() - this.lastFlushTime > FLUSH_TIMEOUT_MS;

    if (isFlushTimeoutHappen) {
      this.lastFlushTime = Date.now();
      const date = new Date(this.lastFlushTime);
      const flushTime = getTime(date);

      log(`Flush events: ${flushTime}`);
      this.flushEvents(wikiOrgId, [...this.eventBatch]).catch((err) => {
        log(`Error on flush events: ${err}`);
      });
      this.eventBatch = [];
    }
  }

  private addEventToBatchOnMessage(rawEvent: MessageEvent) {
    const isInSampleRate = oneIn(SAMPLE_RATE);

    if (!isInSampleRate || MAX_BATCH_CAPACITY <= this.eventBatch.length) {
      return;
    }

    const eventAppearanceTime = Date.now();

    if (
      this.lastBatchAddTime !== undefined &&
      eventAppearanceTime - this.lastBatchAddTime < BATCH_ADD_THROTTLE_MS
    ) {
      return;
    }

    const {
      type,
      title,
      title_url,
      server_url,
      dt: timestamp,
    } = JSON.parse(rawEvent.data);

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
    this.lastBatchAddTime = eventAppearanceTime;
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
    Deno.addSignalListener("SIGINT", () => {
      if (this.wikiOrg?.id) {
        this.flushEvents(this.wikiOrg.id, [...this.eventBatch]);
      }

      Deno.exit(0);
    });
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

const wikiSourceService = new WikiSourceService();
await wikiSourceService.init();

export { wikiSourceService };
