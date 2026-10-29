import { uiMessageChunkSchema, type ChatTransport, type UIMessage, type UIMessageChunk } from "ai";
import { MAX_FRAME_BYTES, parseClientFrame } from "./protocol";
import type { DashboardContext } from "./dashboard-context";

export class AssistantTransportError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "AssistantTransportError";
  }
}

type Options = {
  url: string | (() => string);
  /** Injection for tests; production uses the browser's native WebSocket. */
  createSocket?: (url: string) => WebSocket;
  connectTimeoutMs?: number;
  requestTimeoutMs?: number;
  getDashboardContext?: () => DashboardContext | undefined;
};

/** One socket per explicit submission; reconnect never replays an interrupted request. */
export class AssistantWebSocketTransport implements ChatTransport<UIMessage> {
  private stop?: () => void;
  constructor(private readonly options: Options) {
    for (const timeout of [options.connectTimeoutMs, options.requestTimeoutMs]) {
      if (timeout !== undefined && (!Number.isInteger(timeout) || timeout < 1)) throw new Error("Transport timeouts must be positive integers");
    }
  }

  async reconnectToStream(): Promise<null> { return null; }

  close() { this.stop?.(); }

  async sendMessages(options: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]): Promise<ReadableStream<UIMessageChunk>> {
    if (this.stop) throw new AssistantTransportError("BUSY", "A response is already in progress.");
    options.abortSignal?.throwIfAborted();
    // The current backend supports text conversations only. Reject unsupported input.
    if (options.messages.some((message) => message.role === "system" || message.parts.some((part) => part.type !== "text" && part.type !== "step-start"))) {
      throw new AssistantTransportError("INVALID_MESSAGES", "Only user and assistant text messages are supported.");
    }
    const frame = {
      version: 1, type: "chat", requestId: crypto.randomUUID(),
      dashboardContext: this.options.getDashboardContext?.(),
      messages: options.messages.map((message) => ({ id: message.id, role: message.role, parts: message.parts.flatMap((part) => part.type === "text" && part.text.length > 0 ? [{ type: part.type, text: part.text }] : []) })).filter((message) => message.role !== "assistant" || message.parts.length > 0),
    };
    const payload = JSON.stringify(frame);
    if (!parseClientFrame(payload) || new TextEncoder().encode(payload).length > MAX_FRAME_BYTES) {
      throw new AssistantTransportError("INVALID_MESSAGES", "Conversation exceeds the assistant limits. Start a new conversation.");
    }
    const url = new URL(typeof this.options.url === "function" ? this.options.url() : this.options.url);
    if (!["ws:", "wss:"].includes(url.protocol) || url.username || url.password || url.hash) throw new Error("Assistant URL must use ws:// or wss:// without credentials or fragment");
    const socket = (this.options.createSocket ?? ((address) => new WebSocket(address)))(url.href);
    let controller: ReadableStreamDefaultController<UIMessageChunk>;
    let ended = false;
    let accepted = false;
    let processing = Promise.resolve();
    let queued = 0;
    const finish = (error?: Error, cancel = false, consumerCancelled = false) => {
      if (ended) return;
      ended = true;
      clearTimeout(connectTimer);
      clearTimeout(requestTimer);
      options.abortSignal?.removeEventListener("abort", abort);
      socket.removeEventListener("open", open);
      socket.removeEventListener("message", message);
      socket.removeEventListener("close", closed);
      socket.removeEventListener("error", failed);
      if (cancel && socket.readyState === 1) {
        try { socket.send(JSON.stringify({ version: 1, type: "cancel", requestId: frame.requestId })); } catch { /* Closing the socket also aborts backend work. */ }
      }
      // Browsers permit close() while CONNECTING; it prevents a late submission.
      socket.close();
      this.stop = undefined;
      if (!consumerCancelled) {
        if (error) controller.error(error);
        else controller.close();
      }
    };
    const abort = () => finish(new DOMException("Assistant request aborted", "AbortError"), true);
    const failed = () => finish(new AssistantTransportError("CONNECTION_FAILED", "Could not connect to the assistant."));
    const closed = () => { void processing.then(() => finish(new AssistantTransportError("DISCONNECTED", "Assistant disconnected. Send a new message to reconnect."))); };
    const open = () => {
      if (ended) return;
      clearTimeout(connectTimer);
      try { socket.send(payload); } catch { failed(); }
    };
    const message = (event: MessageEvent) => {
      if (ended) return;
      if (++queued > 512) { finish(new AssistantTransportError("INVALID_RESPONSE", "Assistant sent too much buffered data."), true); return; }
      processing = processing.then(async () => {
        queued--;
        if (ended) return;
        if (typeof event.data !== "string" || event.data.length > 256 * 1024) throw new Error("Invalid frame");
        const value = JSON.parse(event.data);
        if (!value || value.version !== 1 || typeof value.type !== "string") throw new Error("Invalid frame");
        if (value.requestId !== frame.requestId) {
          if (value.requestId === null && value.type === "error") throw new Error("Invalid request");
          return; // A different request must never alter this stream.
        }
        if (value.type === "error") {
          if (typeof value.code !== "string" || typeof value.message !== "string") throw new Error("Invalid error");
          finish(new AssistantTransportError(value.code, value.message));
        } else if (value.type === "accepted") {
          if (accepted) throw new Error("Duplicate acceptance");
          accepted = true;
        } else if (value.type === "chunk") {
          if (!accepted) throw new Error("Unaccepted stream");
          const parsed = await uiMessageChunkSchema().validate!(value.chunk);
          if (!parsed.success) throw new Error("Invalid chunk");
          if (ended) return;
          if ((controller.desiredSize ?? 0) < -512) throw new Error("Slow consumer");
          controller.enqueue(parsed.value);
        } else if (value.type === "done") {
          if (!accepted || !["completed", "cancelled"].includes(value.reason)) throw new Error("Invalid completion");
          finish();
        } else throw new Error("Unknown frame");
      }).catch(() => finish(new AssistantTransportError("INVALID_RESPONSE", "Assistant returned an invalid response."), true));
    };
    const stream = new ReadableStream<UIMessageChunk>({
      start(value) { controller = value; },
      cancel: () => finish(undefined, true, true),
    });
    this.stop = abort;
    socket.addEventListener("open", open);
    socket.addEventListener("message", message);
    socket.addEventListener("close", closed);
    socket.addEventListener("error", failed);
    options.abortSignal?.addEventListener("abort", abort, { once: true });
    const connectTimer = setTimeout(() => finish(new AssistantTransportError("CONNECT_TIMEOUT", "Assistant connection timed out.")), this.options.connectTimeoutMs ?? 10_000);
    const requestTimer = setTimeout(() => finish(new AssistantTransportError("TIMEOUT", "Assistant response timed out."), true), this.options.requestTimeoutMs ?? 45_000);
    if (options.abortSignal?.aborted) abort();
    return stream;
  }
}
