import * as v from "valibot";
import type { UIMessageChunk } from "ai";
import { dashboardContextSchema } from "./dashboard-context";

export const PROTOCOL_VERSION = 1;
export const MAX_FRAME_BYTES = 64 * 1024;
const identifier = v.pipe(v.string(), v.minLength(1), v.maxLength(128), v.regex(/^[\w-]+$/));
const textPart = v.strictObject({ type: v.literal("text"), text: v.pipe(v.string(), v.minLength(1), v.maxLength(8_000)) });
const message = v.strictObject({
  id: identifier,
  role: v.picklist(["user", "assistant"]),
  parts: v.pipe(v.array(textPart), v.minLength(1), v.maxLength(8)),
});
const messages = v.pipe(v.array(message), v.minLength(1), v.maxLength(32),
  v.check((items) => items.reduce((total, item) => total + item.parts.reduce((sum, part) => sum + part.text.length, 0), 0) <= 24_000),
  v.check((items) => new Set(items.map((item) => item.id)).size === items.length),
  v.check((items) => items.at(-1)?.role === "user"));

export const clientFrameSchema = v.variant("type", [
  v.strictObject({ version: v.literal(PROTOCOL_VERSION), type: v.literal("chat"), requestId: identifier, messages, dashboardContext: v.optional(dashboardContextSchema) }),
  v.strictObject({ version: v.literal(PROTOCOL_VERSION), type: v.literal("cancel"), requestId: identifier }),
]);
export type ClientFrame = v.InferOutput<typeof clientFrameSchema>;
export type ChatFrame = Extract<ClientFrame, { type: "chat" }>;
export type ErrorCode = "INVALID_FRAME" | "BUSY" | "DUPLICATE_REQUEST" | "UNKNOWN_REQUEST" | "ASSISTANT_NOT_READY" | "GENERATION_FAILED" | "TIMEOUT" | "OLLAMA_UNAVAILABLE" | "MODEL_NOT_FOUND" | "MODEL_LOADING";
export class GenerationError extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
    this.name = "GenerationError";
  }
}
export type ServerFrame = { version: 1; requestId: string | null } & (
  | { type: "accepted" }
  | { type: "chunk"; chunk: UIMessageChunk }
  | { type: "done"; reason: "completed" | "cancelled" }
  | { type: "error"; code: ErrorCode; message: string }
);

export type Generate = (request: ChatFrame, context: {
  signal: AbortSignal;
  emit: (chunk: UIMessageChunk) => void;
}) => Promise<void>;

export function parseClientFrame(text: string): ClientFrame | null {
  try {
    const parsed = v.safeParse(clientFrameSchema, JSON.parse(text));
    return parsed.success ? parsed.output : null;
  } catch {
    return null;
  }
}
