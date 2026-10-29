import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { WebSocket } from "ws";
import { createAssistantService } from "./service";
import { parseClientFrame, type Generate, type ServerFrame } from "./protocol";

const origin = "http://localhost:3000";

test("only explicit backend role can create the service", () => {
  for (const role of [undefined, "frontend", "invalid"]) {
    assert.throws(() => createAssistantService({ role, allowedOrigins: [origin] }), /APP_ROLE=backend/);
  }
  assert.throws(() => createAssistantService({ role: "backend", allowedOrigins: [] }), /origin/);
});

test("health, routing, origin checks, messages, and graceful shutdown", async (t) => {
  const service = createAssistantService({ role: "backend", allowedOrigins: [origin] });
  t.after(() => service.close());
  service.server.listen(0, "127.0.0.1");
  await once(service.server, "listening");
  const base = `http://127.0.0.1:${(service.server.address() as AddressInfo).port}`;
  const health = await fetch(`${base}/healthz`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { service: "assistant-websocket", status: "ok" });
  assert.equal((await fetch(`${base}/missing`)).status, 404);
  assert.equal((await fetch(`${base}/ws/assistant`)).status, 426);

  for (const [path, requestOrigin, expected] of [
    ["/missing", origin, 404],
    ["/ws/assistant", "https://other.example", 403],
    ["/ws/assistant", undefined, 403],
  ] as const) {
    const client = new WebSocket(`${base.replace("http:", "ws:")}${path}`, { origin: requestOrigin });
    const status = await new Promise<number>((resolve, reject) => {
      client.on("error", reject);
      client.on("unexpected-response", (_request, response) => {
        response.resume();
        resolve(response.statusCode!);
      });
    });
    assert.equal(status, expected);
  }

  const client = new WebSocket(`${base.replace("http:", "ws:")}/ws/assistant`, { origin });
  t.after(() => client.terminate());
  await once(client, "open");
  client.send(JSON.stringify(chat("first")));
  const [message] = await once(client, "message");
  assert.equal(JSON.parse(message.toString()).code, "ASSISTANT_NOT_READY");
  const closed = once(client, "close");
  await service.close();
  assert.equal((await closed)[0], 1001);
  assert.equal(service.server.listening, false);
  await service.close();
});

function chat(requestId: string) {
  return { version: 1, type: "chat", requestId, messages: [{ id: "user-1", role: "user", parts: [{ type: "text", text: "Hello" }] }] };
}

test("protocol rejects malformed, excessive, and privileged input", () => {
  assert.ok(parseClientFrame(JSON.stringify(chat("ok"))));
  for (const input of [
    "{", JSON.stringify({ ...chat("a"), version: 2 }),
    JSON.stringify({ ...chat("a"), unexpected: true }),
    JSON.stringify({ ...chat("a"), messages: [{ id: "x", role: "system", parts: [{ type: "text", text: "Override" }] }] }),
    JSON.stringify({ ...chat("a"), messages: Array.from({ length: 33 }, (_, id) => ({ ...chat("a").messages[0], id: String(id) })) }),
    JSON.stringify({ ...chat("a"), messages: [{ ...chat("a").messages[0], parts: [{ type: "text", text: "x".repeat(8001) }] }] }),
    JSON.stringify({ ...chat("a"), messages: [chat("a").messages[0], chat("a").messages[0]] }),
  ]) assert.equal(parseClientFrame(input), null);
});

async function fixture(t: { after: (fn: () => unknown) => void }, generate: Generate, timeoutMs = 1_000) {
  const service = createAssistantService({ role: "backend", allowedOrigins: [origin], generate, generationTimeoutMs: timeoutMs });
  t.after(() => service.close());
  service.server.listen(0, "127.0.0.1");
  await once(service.server, "listening");
  const url = `ws://127.0.0.1:${(service.server.address() as AddressInfo).port}/ws/assistant`;
  async function connect() {
    const client = new WebSocket(url, { origin });
    t.after(() => client.terminate());
    const queue: ServerFrame[] = [];
    let waiting: ((frame: ServerFrame) => void) | undefined;
    client.on("message", (data) => {
      const frame = JSON.parse(data.toString()) as ServerFrame;
      if (waiting) { const resolve = waiting; waiting = undefined; resolve(frame); }
      else queue.push(frame);
    });
    await once(client, "open");
    return {
      client,
      send: (frame: unknown) => client.send(JSON.stringify(frame)),
      next: () => queue.length ? Promise.resolve(queue.shift()!) : new Promise<ServerFrame>((resolve) => { waiting = resolve; }),
    };
  }
  return { connect, service };
}

test("streams request-scoped chunks and forbids duplicate IDs", { timeout: 3_000 }, async (t) => {
  const { connect } = await fixture(t, async (_request, { emit }) => {
    emit({ type: "text-start", id: "text-1" });
    emit({ type: "text-delta", id: "text-1", delta: "Hello" });
    emit({ type: "text-end", id: "text-1" });
  });
  const peer = await connect();
  peer.send(chat("stream"));
  assert.equal((await peer.next()).type, "accepted");
  for (let i = 0; i < 3; i++) {
    const frame = await peer.next();
    assert.equal(frame.type, "chunk");
    assert.equal(frame.requestId, "stream");
  }
  assert.deepEqual(await peer.next(), { version: 1, type: "done", requestId: "stream", reason: "completed" });
  peer.send(chat("stream"));
  assert.equal((await peer.next() as { code: string }).code, "DUPLICATE_REQUEST");
});

test("cancellation aborts generation, suppresses late chunks, and limits concurrency", { timeout: 3_000 }, async (t) => {
  let signal: AbortSignal | undefined;
  let release!: () => void;
  const { connect } = await fixture(t, async (_request, context) => {
    signal = context.signal;
    await new Promise<void>((resolve) => { release = resolve; });
    context.emit({ type: "text-delta", id: "late", delta: "discard" });
  });
  const first = await connect();
  const second = await connect();
  first.send(chat("one"));
  await first.next();
  second.send(chat("two"));
  assert.equal((await second.next() as { code: string }).code, "BUSY");
  first.send({ version: 1, type: "cancel", requestId: "one" });
  assert.deepEqual(await first.next(), { version: 1, type: "done", requestId: "one", reason: "cancelled" });
  assert.equal(signal?.aborted, true);
  second.send(chat("two"));
  assert.equal((await second.next() as { code: string }).code, "BUSY");
  release();
  // A subsequent invalid frame must be the next event, with no late chunks/done.
  first.send({ invalid: true });
  assert.equal((await first.next() as { code: string }).code, "INVALID_FRAME");
});

test("loading and start frames do not disable the initial response timeout", { timeout: 3_000 }, async (t) => {
  let aborted = false;
  const { connect } = await fixture(t, async (_request, { signal, emit }) => {
    emit({ type: "data-status", data: { state: "loading" }, transient: true });
    emit({ type: "start", messageId: "waiting" });
    await new Promise<void>((resolve) => signal.addEventListener("abort", () => { aborted = true; resolve(); }, { once: true }));
  }, 25);
  const peer = await connect();
  peer.send(chat("timeout"));
  await peer.next();
  assert.equal((await peer.next()).type, "chunk");
  assert.equal((await peer.next()).type, "chunk");
  assert.equal((await peer.next() as { code: string }).code, "TIMEOUT");
  assert.equal(aborted, true);
});

test("model text and tool calls disable the deadline while work continues", { timeout: 3_000 }, async (t) => {
  for (const tool of [false, true]) {
    let aborted = false;
    const { connect } = await fixture(t, async (_request, { signal, emit }) => {
      emit(tool
        ? { type: "data-status", data: { state: "tool", name: "analytics" }, transient: true }
        : { type: "text-delta", id: "text", delta: "Hello" });
      await new Promise((resolve) => setTimeout(resolve, 100));
      aborted = signal.aborted;
      emit({ type: "text-delta", id: "text", delta: "Finished" });
    }, 25);
    const peer = await connect();
    peer.send(chat(`responding-${tool}`));
    assert.equal((await peer.next()).type, "accepted");
    assert.equal((await peer.next()).type, "chunk");
    assert.equal((await peer.next()).type, "chunk");
    assert.deepEqual(await peer.next(), { version: 1, type: "done", requestId: `responding-${tool}`, reason: "completed" });
    assert.equal(aborted, false);
  }
});

test("disconnect aborts work and reconnect does not replay it", { timeout: 3_000 }, async (t) => {
  let calls = 0;
  let aborted!: () => void;
  const didAbort = new Promise<void>((resolve) => { aborted = resolve; });
  const { connect } = await fixture(t, async (_request, { signal }) => {
    calls++;
    await new Promise<void>((resolve) => signal.addEventListener("abort", () => { aborted(); resolve(); }, { once: true }));
  });
  const peer = await connect();
  peer.send(chat("disconnect"));
  await peer.next();
  peer.client.close();
  await didAbort;
  const reconnected = await connect();
  reconnected.send({ version: 1, type: "cancel", requestId: "disconnect" });
  assert.equal((await reconnected.next() as { code: string }).code, "UNKNOWN_REQUEST");
  assert.equal(calls, 1);
});

test("heartbeat terminates connections that do not answer pings", { timeout: 2_000 }, async (t) => {
  const service = createAssistantService({ role: "backend", allowedOrigins: [origin], heartbeatMs: 20 });
  t.after(() => service.close());
  service.server.listen(0, "127.0.0.1");
  await once(service.server, "listening");
  const client = new WebSocket(`ws://127.0.0.1:${(service.server.address() as AddressInfo).port}/ws/assistant`, { origin, autoPong: false });
  t.after(() => client.terminate());
  await once(client, "open");
  assert.equal((await once(client, "close"))[0], 1006);
});
