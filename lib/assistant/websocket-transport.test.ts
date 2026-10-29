import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { WebSocket as NodeWebSocket } from "ws";
import { readUIMessageStream, type ChatTransport, type UIMessage } from "ai";
import { createAssistantService } from "../../server/assistant/service";
import { AssistantWebSocketTransport } from "./websocket-transport";

const input: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0] = {
  trigger: "submit-message", chatId: "chat", messageId: undefined, abortSignal: undefined,
  messages: [{ id: "user-1", role: "user", parts: [{ type: "text", text: "Hello" }] }],
};
class Socket extends EventTarget {
  readyState = 0;
  sent: Record<string, unknown>[] = [];
  send(text: string) { this.sent.push(JSON.parse(text)); }
  close() { this.readyState = 3; }
  open() { this.readyState = 1; this.dispatchEvent(new Event("open")); }
  frame(value: object) { this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ version: 1, requestId: this.sent[0]?.requestId, ...value }) })); }
}
function fixture(connectTimeoutMs = 1_000) {
  const sockets: Socket[] = [];
  const transport = new AssistantWebSocketTransport({ url: "ws://localhost/ws/assistant", connectTimeoutMs, createSocket: () => {
    const socket = new Socket(); sockets.push(socket); return socket as unknown as WebSocket;
  } });
  return { transport, sockets };
}

test("unwraps validated chunks, isolates IDs, completes, and reconnects only on submission", async () => {
  const { transport, sockets } = fixture();
  const reader = (await transport.sendMessages(input)).getReader();
  const socket = sockets[0]; socket.open();
  socket.frame({ type: "chunk", requestId: "another", chunk: {} });
  socket.frame({ type: "accepted" });
  socket.frame({ type: "chunk", chunk: { type: "text-delta", id: "t", delta: "Hi" } });
  socket.frame({ type: "done", reason: "completed" });
  assert.deepEqual((await reader.read()).value, { type: "text-delta", id: "t", delta: "Hi" });
  assert.equal((await reader.read()).done, true);
  assert.equal(socket.readyState, 3);
  assert.equal(await transport.reconnectToStream(), null);
  assert.equal(sockets.length, 1);
  const next = (await transport.sendMessages(input)).getReader();
  sockets[1].open();
  assert.notEqual(sockets[1].sent[0].requestId, socket.sent[0].requestId);
  const failure = assert.rejects(next.read(), { name: "AbortError" });
  transport.close(); await failure;
});

test("abort before/during connection and reader cancellation clean up sockets", async () => {
  for (const open of [false, true]) {
    const { transport, sockets } = fixture();
    const controller = new AbortController();
    const reader = (await transport.sendMessages({ ...input, abortSignal: controller.signal })).getReader();
    if (open) sockets[0].open();
    const failure = assert.rejects(reader.read(), { name: "AbortError" });
    controller.abort(); await failure;
    assert.equal(sockets[0].readyState, 3);
    assert.equal(sockets[0].sent.some((frame) => frame.type === "cancel"), open);
  }
  const { transport, sockets } = fixture();
  const stream = await transport.sendMessages(input); sockets[0].open();
  await stream.cancel();
  assert.equal(sockets[0].sent.at(-1)?.type, "cancel");
  const aborted = new AbortController(); aborted.abort();
  await assert.rejects(transport.sendMessages({ ...input, abortSignal: aborted.signal }), { name: "AbortError" });
  assert.equal(sockets.length, 1);
});

test("surfaces server, malformed chunk, connection, and timeout errors", async () => {
  for (const kind of ["server", "chunk", "close", "error", "timeout"]) {
    const { transport, sockets } = fixture(10);
    const reader = (await transport.sendMessages(input)).getReader();
    const failure = assert.rejects(reader.read());
    const socket = sockets[0];
    if (kind !== "timeout") socket.open();
    if (kind === "server") socket.frame({ type: "error", code: "MODEL_NOT_FOUND", message: "Model missing" });
    if (kind === "chunk") { socket.frame({ type: "accepted" }); socket.frame({ type: "chunk", chunk: { type: "text-delta", delta: 42 } }); }
    if (kind === "close" || kind === "error") socket.dispatchEvent(new Event(kind));
    await failure;
    assert.equal(socket.readyState, 3);
  }
});

test("rejects unsupported history and concurrent sends without opening extra sockets", async () => {
  const { transport, sockets } = fixture();
  await assert.rejects(transport.sendMessages({ ...input, messages: [{ id: "s", role: "system", parts: [{ type: "text", text: "system" }] }] }));
  assert.equal(sockets.length, 0);
  const stream = await transport.sendMessages(input);
  await assert.rejects(transport.sendMessages(input), /already in progress/);
  await stream.cancel();
});

test("submission snapshots dashboard context and strips SDK step markers from history", async () => {
  const socket = new Socket();
  const context = { range: "1h", interval: "5m", groupBy: [], eventType: [], page: [], country: ["fr"] } as const;
  const transport = new AssistantWebSocketTransport({ url: "ws://localhost/ws/assistant",
    getDashboardContext: () => ({ ...context, groupBy: [], eventType: [], page: [], country: [...context.country] }),
    createSocket: () => socket as unknown as WebSocket,
  });
  const stream = await transport.sendMessages({ ...input, messages: [
    ...input.messages,
    { id: "assistant-1", role: "assistant", parts: [{ type: "step-start" }, { type: "text", text: "Hi" }] },
    { id: "user-2", role: "user", parts: [{ type: "text", text: "Summarize" }] },
  ] });
  socket.open();
  assert.deepEqual(socket.sent[0].dashboardContext, context);
  assert.ok(!JSON.stringify(socket.sent[0].messages).includes("step-start"));
  await stream.cancel();
});

test("real WebSocket service streams through the transport into AI SDK messages", { timeout: 3_000 }, async (t) => {
  const service = createAssistantService({ role: "backend", allowedOrigins: ["http://localhost:3000"], generate: async (_request, { emit }) => {
    emit({ type: "start", messageId: "assistant-1" });
    emit({ type: "text-start", id: "t" });
    emit({ type: "text-delta", id: "t", delta: "Hello from the backend" });
    emit({ type: "text-end", id: "t" });
    emit({ type: "finish" });
  } });
  t.after(() => service.close());
  service.server.listen(0, "127.0.0.1"); await once(service.server, "listening");
  const transport = new AssistantWebSocketTransport({
    url: `ws://127.0.0.1:${(service.server.address() as AddressInfo).port}/ws/assistant`,
    createSocket: (url) => new NodeWebSocket(url, { origin: "http://localhost:3000" }) as unknown as WebSocket,
  });
  t.after(() => transport.close());
  let last: UIMessage | undefined;
  for await (const message of readUIMessageStream({ stream: await transport.sendMessages(input) })) last = message;
  assert.equal(last?.role, "assistant");
  assert.equal(last?.parts[0].type === "text" && last.parts[0].text, "Hello from the backend");
});
