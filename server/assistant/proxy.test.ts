import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import type { AddressInfo } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { WebSocket } from "ws";
import { createAssistantService } from "./service";

// Requires a production build targeting ASSISTANT_PROXY_PORT (default 3001).
test("Next.js proxies /api/assistant-ws with streaming, origins, and cancellation", {
  skip: process.env.ASSISTANT_PROXY_TEST !== "1", timeout: 30_000,
}, async (t) => {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = (reservation.address() as AddressInfo).port;
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  let aborted!: () => void;
  const didAbort = new Promise<void>((resolve) => { aborted = resolve; });
  const service = createAssistantService({ role: "backend", allowedOrigins: [origin], generate: async (_request, { signal, emit }) => {
    emit({ type: "start", messageId: "assistant-1" });
    emit({ type: "text-start", id: "t" });
    emit({ type: "text-delta", id: "t", delta: "Proxied response" });
    await new Promise<void>((resolve) => signal.addEventListener("abort", () => { aborted(); resolve(); }, { once: true }));
  } });
  t.after(() => service.close());
  service.server.listen(Number(process.env.ASSISTANT_PROXY_PORT ?? 3001), "127.0.0.1");
  await once(service.server, "listening");
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { env: { ...process.env, APP_ROLE: "frontend" }, stdio: "pipe" });
  let logs = "";
  child.stdout.on("data", (chunk) => { logs += chunk; });
  child.stderr.on("data", (chunk) => { logs += chunk; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit"); child.kill("SIGTERM"); await exited;
    }
  });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Next.js exited: ${logs}`);
    try {
      const response = await fetch(`${origin}/api/assistant-ws`, { signal: AbortSignal.timeout(500) });
      if (response.status === 426) { ready = true; break; }
    } catch { /* Startup is asynchronous. */ }
    await delay(100);
  }
  assert.ok(ready, logs);
  const denied = new WebSocket(`${origin.replace("http:", "ws:")}/api/assistant-ws`, { origin: "https://not-allowed.example" });
  t.after(() => denied.terminate());
  const rejected = await new Promise<number | undefined>((resolve, reject) => {
    denied.on("error", reject);
    denied.on("unexpected-response", (_request, response) => { response.resume(); resolve(response.statusCode); });
  });
  assert.equal(rejected, 403);
  const client = new WebSocket(`${origin.replace("http:", "ws:")}/api/assistant-ws`, { origin });
  t.after(() => client.terminate());
  const frames: { type: string; reason?: string; chunk?: { type: string; delta?: string } }[] = [];
  client.on("message", (data) => frames.push(JSON.parse(data.toString())));
  await once(client, "open");
  client.send(JSON.stringify({ version: 1, type: "chat", requestId: "proxy-1", messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "hello" }] }] }));
  for (let i = 0; i < 100 && !frames.some((frame) => frame.chunk?.delta === "Proxied response"); i++) await delay(10);
  assert.ok(frames.some((frame) => frame.chunk?.delta === "Proxied response"));
  client.send(JSON.stringify({ version: 1, type: "cancel", requestId: "proxy-1" }));
  await didAbort;
  for (let i = 0; i < 100 && !frames.some((frame) => frame.reason === "cancelled"); i++) await delay(10);
  assert.ok(frames.some((frame) => frame.type === "done" && frame.reason === "cancelled"));
  client.close();
  await once(client, "close");
});
