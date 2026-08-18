/// <reference lib="deno.ns" />

import { EventSource } from "eventsource";
import { WIKI_ORG } from "../prisma/constants.ts";
import { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getLanguageFromServerUrl } from "./get-language-from-server-url.ts";
import { oneIn } from "./random-int.ts";

type WikiEvent = Pick<
  Prisma.EventCreateInput,
  "type" | "host" | "timestamp" | "path" | "country" | "properties"
>;

const LOCAL_PG_URL = "postgresql://postgres:postgres@localhost:5432/nextjs_dev";
const EVENT_SOURCE_URL = "https://stream.wikimedia.org/v2/stream/recentchange";
const SAMPLE_RATE = 70;
const MAX_BATCH_CAPACITY = 200;
const FLUSH_TIMEOUT_SEC = 60 * 5; // 5 min

type EventChannelConfig = {
  maxBatchCapacity?: number;
  flushTimeoutSec?: number;
};

class WikiSourceService {
  prismaClient: PrismaClient;
  wikiOrg: Prisma.OrganizationCreateInput | null = null;
  eventSource?: EventSource;
  eventBatch: WikiEvent[] = [];

  private reconnectAttempt = 0;
  private reconnectTimer?: NodeJS.Timeout;

  constructor() {
    this.prismaClient = this.getPrismaClient();
  }

  openEventChannel(
    options: EventChannelConfig = {
      flushTimeoutSec: FLUSH_TIMEOUT_SEC,
      maxBatchCapacity: MAX_BATCH_CAPACITY,
    },
  ) {
    console.log(
      `[WikiSourceService] Open event channel, sample rate 1/${SAMPLE_RATE}`,
    );
    const wikiOrgId = this.wikiOrg?.id;

    const flushTimeoutSec = options?.flushTimeoutSec || FLUSH_TIMEOUT_SEC;
    const maxBatchCapacity = options?.maxBatchCapacity || MAX_BATCH_CAPACITY;

    if (this.wikiOrg === null || !wikiOrgId) {
      throw new Error(
        "[WikiSourceService] Wiki org must be defined on channel opening",
      );
    }

    if (this.eventSource) {
      this.closeEventChannel();
    }

    this.eventSource = new EventSource(EVENT_SOURCE_URL, {
      fetch: async (input, init) => {
        const response = await fetch(input, {
          ...init,
          headers: {
            ...init?.headers,
          },
        });

        if (response.status === 429) {
          console.error("[WikiSourceService] Rate limited", {
            retryAfter: response.headers.get("retry-after"),
            requestId: response.headers.get("x-request-id"),
          });
        }

        return response;
      },
    });
    let lastFlushTime = Date.now();

    console.log(`[WikiSourceService] Listen to event channel`);

    this.eventSource.onerror = (err) => {
      console.error("[WikiSourceService] SSE connection failed", {
        code: err.code,
        message: err.message,
        readyState: this.eventSource?.readyState,
        reconnectAttempt: this.reconnectAttempt,
      });

      if (this.eventSource?.CLOSED) {
        this.scheduleReconnect();
      }
    };

    this.eventSource.onopen = () => {
      console.log(
        `[WikiSourceService] Connection reopened, attempt: ${this.reconnectAttempt}`,
      );
      this.reconnectAttempt = 0;
    };

    this.eventSource.onmessage = (rawEvent) => {
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
      const isInSampleRate = oneIn(SAMPLE_RATE);

      if (isInSampleRate && maxBatchCapacity > this.eventBatch.length) {
        this.eventBatch.push(event);
        console.log(
          `[WikiSourceService] Add to batch: ${this.eventBatch.length}/${maxBatchCapacity}`,
        );
      }

      const isFlushTimeoutHappen =
        Date.now() - lastFlushTime > flushTimeoutSec * 1000;

      if (isFlushTimeoutHappen) {
        lastFlushTime = Date.now();
        const date = new Date(lastFlushTime);
        const flushTime = this.getTime(date);

        console.log("[WikiSourceService] Flush events: ", flushTime);
        this.flushEvents(wikiOrgId, [...this.eventBatch]).catch((err) => {
          console.log(`[WikiSourceService] Error on flush events: ${err}`);
        });
        this.eventBatch = [];
      }
    };
  }

  async flushEvents(orgId: number | bigint, events: WikiEvent[]) {
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
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }

  async init() {
    await this.initWikiOrg();
  }

  private getPrismaClient() {
    const pgUrl = process.env.DATABASE_URL || LOCAL_PG_URL;

    const isLocal = pgUrl === LOCAL_PG_URL;
    const isLocalLabel = isLocal ? "local" : "env/prod";
    console.log(`[WikiSourceService] PG_URL: ${isLocalLabel} url`);
    let pool: Pool;
    if (isLocal) {
      pool = new Pool({
        connectionString: pgUrl,
      });
    } else {
      pool = new Pool({
        connectionString: pgUrl,
        ssl: {
          rejectUnauthorized: false,
        },
      });
    }
    const adapter = new PrismaPg(pool);
    const prismaClient = new PrismaClient({ adapter });

    return prismaClient;
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

  private getTwoDigits(num: number) {
    return `${num}`.length < 2 ? `0${num}` : `${num}`;
  }

  private getTime(date: Date) {
    return `${this.getTwoDigits(date.getHours())}:${this.getTwoDigits(date.getMinutes())}:${this.getTwoDigits(date.getSeconds())} ${this.getTwoDigits(date.getDate())}/${this.getTwoDigits(date.getMonth())}/${date.getFullYear()}`;
  }

  private scheduleReconnect() {
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
      this.openEventChannel();
    }, delay);
  }
}

export const wikiSourceService = new WikiSourceService();
