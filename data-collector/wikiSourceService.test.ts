import { equal, deepEqual, rejects } from "node:assert/strict";
import { WikiSourceService } from "./wikiSourceService.ts";
import type { PrismaClient } from "../generated/prisma/client.ts";
import { FLUSH_TIMEOUT_MS } from "../lib/collector-config.ts";

function collector(write: (args: unknown) => Promise<unknown> = () => Promise.resolve()) {
  const service = new WikiSourceService({ event: { createMany: write } } as unknown as PrismaClient);
  service.wikiOrg = { id: 1, name: "test", slug: "test" };
  return service;
}

function message(time: number, meta = true) {
  return new MessageEvent("message", { data: JSON.stringify({
    type: "edit", title: "Example", title_url: "https://en.wikipedia.org/wiki/Example",
    server_url: "https://en.wikipedia.org",
    ...(meta ? { meta: { dt: new Date(time).toISOString() } } : { timestamp: time / 1000 }),
  }) });
}

Deno.test("steady traffic produces 40 events in every minute across three flushes", async () => {
  const service = collector();
  const now = Date.now;
  const log = console.log;
  const start = Date.UTC(2026, 9, 16);
  try {
    console.log = () => {};
    for (let batch = 0; batch < 3; batch++) {
      const counts = new Array(30).fill(0);
      for (let offset = 0; offset < FLUSH_TIMEOUT_MS; offset += 100) {
        const time = start + batch * FLUSH_TIMEOUT_MS + offset;
        Date.now = () => time;
        service["addEventToBatchOnMessage"](message(time));
      }
      equal(service.eventBatch.length, 1200);
      for (const event of service.eventBatch) {
        const time = new Date(event.timestamp!).getTime();
        counts[Math.floor((time - start - batch * FLUSH_TIMEOUT_MS) / 60000)]++;
      }
      deepEqual(counts, new Array(30).fill(40));
      await service.flushBatch();
      equal(service.eventBatch.length, 0);
    }
  } finally {
    Date.now = now;
    console.log = log;
  }
});

Deno.test("source timestamps survive batching; idle periods produce no catch-up bursts", () => {
  const service = collector();
  const now = Date.now;
  const start = Date.UTC(2026, 9, 16);
  try {
    Date.now = () => start;
    service["addEventToBatchOnMessage"](message(start - 10000));
    equal(new Date(service.eventBatch[0].timestamp!).getTime(), start - 10000);
    Date.now = () => start + 60000;
    service["addEventToBatchOnMessage"](message(start + 60000, false));
    service["addEventToBatchOnMessage"](message(start + 60000));
    equal(service.eventBatch.length, 2);
    equal(new Date(service.eventBatch[1].timestamp!).getTime(), start + 60000);
  } finally { Date.now = now; }
});

Deno.test("failed writes retain the old batch and overlapping flushes share a write", async () => {
  let fail = true;
  const writes: unknown[] = [];
  const service = collector(async (args) => {
    writes.push(args);
    if (fail) throw new Error("database unavailable");
  });
  service["addEventToBatchOnMessage"](message(Date.now()));
  const first = service.flushBatch();
  equal(service.flushBatch(), first);
  await rejects(first, /database unavailable/);
  equal(service.eventBatch.length, 0);
  fail = false;
  await service.flushBatch();
  deepEqual(writes[0], writes[1]);
  await service.flushBatch();
  equal(writes.length, 2);
});

Deno.test("flush timer runs every 30 minutes without incoming messages and starts only once", async () => {
  const service = collector();
  const originalInterval = globalThis.setInterval;
  let callback: (() => void) | undefined;
  let starts = 0;
  let flushes = 0;
  service.flushBatch = () => { flushes++; return Promise.resolve(); };
  try {
    globalThis.setInterval = ((fn: () => void, delay: number) => {
      equal(delay, 30 * 60 * 1000);
      starts++;
      callback = fn;
      return 1;
    }) as unknown as typeof setInterval;
    service["startFlushTimer"]();
    service["startFlushTimer"]();
    equal(starts, 1);
    callback!();
    await Promise.resolve();
    equal(flushes, 1);
  } finally { globalThis.setInterval = originalInterval; }
});

Deno.test("an invalid timestamp does not consume the sampling slot", () => {
  const service = collector();
  const now = Date.now;
  const time = Date.UTC(2026, 9, 16);
  try {
    Date.now = () => time;
    const invalid = new MessageEvent("message", { data: JSON.stringify({
      type: "edit", title_url: "https://en.wikipedia.org/wiki/Example",
      server_url: "https://en.wikipedia.org", meta: { dt: "invalid" },
    }) });
    let rejected = false;
    try { service["addEventToBatchOnMessage"](invalid); } catch { rejected = true; }
    equal(rejected, true);
    service["addEventToBatchOnMessage"](message(time));
    equal(service.eventBatch.length, 1);
  } finally { Date.now = now; }
});
