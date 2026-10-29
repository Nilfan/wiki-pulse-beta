import { createServer } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { MAX_FRAME_BYTES, type Generate } from "./protocol";
import { attachSession } from "./session";

export type AssistantServiceOptions = {
  role?: string;
  allowedOrigins: string[];
  heartbeatMs?: number;
  shutdownGraceMs?: number;
  generate?: Generate;
  /** Maximum wait for initial model text or a tool call; cleared once responding. */
  generationTimeoutMs?: number;
  maxConcurrentGenerations?: number;
};

export function createAssistantService(options: AssistantServiceOptions) {
  if (options.role !== "backend") {
    throw new Error("Assistant service requires APP_ROLE=backend");
  }
  const origins = new Set(options.allowedOrigins.map((origin) => {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin) {
      throw new Error("Assistant origins must be exact HTTP(S) origins");
    }
    return origin;
  }));
  if (!origins.size) throw new Error("At least one assistant origin is required");
  const pool = { active: 0, limit: options.maxConcurrentGenerations ?? 1 };
  const timeoutMs = options.generationTimeoutMs ?? 180_000;
  if (!Number.isInteger(pool.limit) || pool.limit < 1 || !Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new Error("Generation concurrency and timeout must be positive integers");
  }
  const sessions = new Map<WebSocket, () => void>();

  let stopping = false;
  const server = createServer((request, response) => {
    response.setHeader("Cache-Control", "no-store");
    if (request.url === "/healthz" && request.method === "GET") {
      response.writeHead(stopping ? 503 : 200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ service: "assistant-websocket", status: stopping ? "stopping" : "ok" }));
    } else if (request.url === "/ws/assistant") {
      response.writeHead(426, { Upgrade: "websocket" });
      response.end("WebSocket upgrade required");
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  const sockets = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES, perMessageDeflate: false });
  const alive = new Set<WebSocket>();

  server.on("upgrade", (request, socket, head) => {
    socket.on("error", () => socket.destroy());
    const reject = (status: string) => {
      socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    };
    if (stopping) return reject("503 Service Unavailable");
    if (request.url !== "/ws/assistant") return reject("404 Not Found");
    if (!request.headers.origin || !origins.has(request.headers.origin)) return reject("403 Forbidden");
    sockets.handleUpgrade(request, socket, head, (client) => sockets.emit("connection", client, request));
  });
  sockets.on("connection", (client) => {
    alive.add(client);
    client.on("pong", () => alive.add(client));
    client.on("close", () => { alive.delete(client); sessions.delete(client); });
    client.on("error", () => client.terminate());
    sessions.set(client, attachSession(client, { generate: options.generate, pool, timeoutMs }));
  });
  const heartbeat = setInterval(() => {
    for (const client of sockets.clients) {
      if (!alive.delete(client)) client.terminate();
      else if (client.readyState === WebSocket.OPEN) client.ping();
    }
  }, options.heartbeatMs ?? 30_000);
  heartbeat.unref();

  let closing: Promise<void> | undefined;
  function close(): Promise<void> {
    if (closing) return closing;
    stopping = true;
    clearInterval(heartbeat);
    for (const abort of sessions.values()) abort();
    closing = new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => {
        for (const client of sockets.clients) client.terminate();
        server.closeAllConnections();
      }, options.shutdownGraceMs ?? 5_000);
      for (const client of sockets.clients) client.close(1001, "Server shutting down");
      const websocketClosed = new Promise<void>((done) => sockets.close(() => done()));
      const httpClosed = new Promise<void>((done, fail) => server.close((error) => {
        if (error && !("code" in error && error.code === "ERR_SERVER_NOT_RUNNING")) fail(error);
        else done();
      }));
      Promise.all([websocketClosed, httpClosed]).then(() => {
        clearTimeout(deadline);
        resolve();
      }, (error) => {
        clearTimeout(deadline);
        reject(error);
      });
    });
    return closing;
  }
  return { server, close };
}
