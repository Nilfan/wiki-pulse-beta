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
const SAMPLE_RATE = 3000;
const MAX_BATCH_CAPACITY = 350;

class WikiSourceService {
  prismaClient: PrismaClient;
  wikiOrg: Prisma.OrganizationCreateInput | null = null;
  eventSource?: EventSource;
  eventBatch: WikiEvent[] = [];

  constructor() {
    this.prismaClient = this.getPrismaClient();
  }

  openEventChannel() {
    const wikiOrgId = this.wikiOrg?.id;

    if (this.wikiOrg === null || !wikiOrgId) {
      throw new Error(
        "[WikiSourceService] Wiki org must be defined on channel opening",
      );
    }

    if (this.eventSource) {
      this.closeEventChannel();
    }

    this.eventSource = new EventSource(EVENT_SOURCE_URL);

    this.eventSource.onerror = (err) => {
      console.error("SSE stream encountered an error:", err);
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

      if (isInSampleRate) {
        this.eventBatch.push(event);
        console.log(
          `[WikiSourceService] Event is in sample rate, batch fill ${this.eventBatch.length}/${MAX_BATCH_CAPACITY}`,
        );
      }

      if (MAX_BATCH_CAPACITY === this.eventBatch.length) {
        console.log("[WikiSourceService] Flush events");
        this.flushEvents(wikiOrgId, [...this.eventBatch]);
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
    const pgUrl = process.env.PG_URL || LOCAL_PG_URL;
    const isLocalLabel = pgUrl === LOCAL_PG_URL ? "local" : "env/prod";
    console.log(`[WikiSourceService] PG_URL: ${isLocalLabel} url`);
    const pool = new Pool({
      connectionString: pgUrl,
    });
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
}

export const wikiSourceService = new WikiSourceService();
