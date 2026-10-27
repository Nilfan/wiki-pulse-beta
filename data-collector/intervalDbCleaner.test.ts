import { equal, deepEqual } from "node:assert/strict";
import type { PrismaClient } from "../generated/prisma/client.ts";
import { IntervalDbCleaner } from "./intervalDbCleaner.ts";
import { CLEARANCE_DB_PERIOD_DAYS } from "../lib/collector-config.ts";

function cleaner(remove: (args: unknown) => Promise<{ count: number }>) {
  return new IntervalDbCleaner({ event: { deleteMany: remove } } as unknown as PrismaClient);
}

Deno.test("cleanup uses the injected database and configured retention cutoff", async () => {
  const now = Date.UTC(2026, 9, 27);
  let received: unknown;
  await cleaner(async args => { received = args; return { count: 2 }; }).clean(now);
  deepEqual(received, { where: { timestamp: { lt: new Date(now - CLEARANCE_DB_PERIOD_DAYS * 86400000) } } });
});

Deno.test("a rejected cleanup is caught and the next cleanup can succeed", async () => {
  let calls = 0;
  const errors: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };
  try {
    const instance = cleaner(async () => {
      if (++calls === 1) throw new Error("The server does not support SSL connections");
      return { count: 0 };
    });
    await instance.clean();
    await instance.clean();
    equal(calls, 2);
    equal(errors.length, 1);
  } finally {
    console.error = original;
  }
});

Deno.test("scheduled cleanups cannot overlap", async () => {
  let finish!: (value: { count: number }) => void;
  let calls = 0;
  const instance = cleaner(() => {
    calls++;
    return new Promise(resolve => { finish = resolve; });
  });
  const first = instance.clean();
  await instance.clean();
  equal(calls, 1);
  finish({ count: 0 });
  await first;
});
