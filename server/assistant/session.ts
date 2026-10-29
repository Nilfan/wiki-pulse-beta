import { WebSocket } from "ws";
import { GenerationError, parseClientFrame, type ErrorCode, type Generate, type ServerFrame } from "./protocol";

export type GenerationPool = { active: number; limit: number };

export function attachSession(client: WebSocket, options: {
  generate?: Generate;
  pool: GenerationPool;
  timeoutMs: number;
}) {
  let active: { id: string; controller: AbortController; terminal: boolean } | undefined;
  // IDs are never replayed on this connection; close before this set can grow unbounded.
  const seen = new Set<string>();
  function send(frame: ServerFrame) {
    if (client.readyState !== WebSocket.OPEN) return;
    if (client.bufferedAmount > 256 * 1024) {
      active?.controller.abort();
      client.terminate();
      return;
    }
    client.send(JSON.stringify(frame));
  }
  function error(requestId: string | null, code: ErrorCode, message: string) {
    send({ version: 1, type: "error", requestId, code, message });
  }
  client.on("close", () => active?.controller.abort());
  client.on("message", (data, isBinary) => {
    const frame = isBinary ? null : parseClientFrame(data.toString());
    if (!frame) return error(null, "INVALID_FRAME", "Invalid assistant frame.");
    if (frame.type === "cancel") {
      if (!active || active.id !== frame.requestId || active.terminal) {
        return error(frame.requestId, "UNKNOWN_REQUEST", "No active request with this ID.");
      }
      active.terminal = true;
      active.controller.abort();
      send({ version: 1, type: "done", requestId: frame.requestId, reason: "cancelled" });
      return;
    }
    if (seen.has(frame.requestId)) return error(frame.requestId, "DUPLICATE_REQUEST", "Use a new request ID.");
    if (active || options.pool.active >= options.pool.limit) return error(frame.requestId, "BUSY", "Assistant is busy. Try again later.");
    if (seen.size >= 1_000) {
      client.close(1008, "Reconnect with a new session");
      return;
    }
    seen.add(frame.requestId);
    if (!options.generate) return error(frame.requestId, "ASSISTANT_NOT_READY", "Chat generation is not configured yet.");

    const request = { id: frame.requestId, controller: new AbortController(), terminal: false };
    active = request;
    options.pool.active++;
    send({ version: 1, type: "accepted", requestId: request.id });
    const timeout = setTimeout(() => {
      if (request.terminal) return;
      request.terminal = true;
      request.controller.abort();
      error(request.id, "TIMEOUT", "Assistant request timed out.");
    }, options.timeoutMs);
    timeout.unref();
    void Promise.resolve().then(() => {
      if (request.controller.signal.aborted) return;
      return options.generate!(frame, {
        signal: request.controller.signal,
        emit: (chunk) => {
          if (!request.terminal && !request.controller.signal.aborted) {
            send({ version: 1, type: "chunk", requestId: request.id, chunk });
          }
        },
      });
    }).then(() => {
      if (!request.terminal && !request.controller.signal.aborted) {
        send({ version: 1, type: "done", requestId: request.id, reason: "completed" });
      }
    }, (failure: unknown) => {
      if (!request.terminal && !request.controller.signal.aborted) {
        error(request.id, failure instanceof GenerationError ? failure.code : "GENERATION_FAILED", failure instanceof GenerationError ? failure.message : "Assistant generation failed.");
      }
    }).finally(() => {
      clearTimeout(timeout);
      options.pool.active--;
      if (active === request) active = undefined;
    });
  });
  return () => {
    if (active) {
      active.terminal = true;
      active.controller.abort();
    }
  };
}
