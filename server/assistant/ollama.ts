import { stepCountIs, streamText, toUIMessageStream } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import { GenerationError, type Generate } from "./protocol";
import { ASSISTANT_INSTRUCTIONS, createAssistantTools } from "./tools";
import type { Analytics } from "./analytics";

export function createOllamaGenerator(options: {
  baseURL?: string;
  model?: string;
  fetch?: typeof fetch;
  analytics?: Partial<Analytics>;
} = {}): Generate {
  // Configuration is read only by the backend entry point, never by a browser.
  const base = new URL(options.baseURL ?? "http://127.0.0.1:11434");
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error("OLLAMA_BASE_URL must be an HTTP(S) URL without credentials, query, or fragment");
  }
  const baseURL = `${base.href.replace(/\/$/, "").replace(/\/api$/, "")}/api`;
  const model = options.model ?? "bonsai-2:9b";
  if (!model.trim()) throw new Error("OLLAMA_MODEL must not be empty");

  return async (request, { signal, emit }) => {
    let upstreamError: GenerationError | undefined;
    const provider = createOllama({
      baseURL,
      fetch: async (input, init) => {
        try {
          const response = await (options.fetch ?? fetch)(input, { ...init, redirect: "error" });
          if (!response.ok) {
            upstreamError = response.status === 404
              ? new GenerationError("MODEL_NOT_FOUND", "The configured Ollama model is not installed.")
              : response.status === 503
                ? new GenerationError("MODEL_LOADING", "Ollama is busy or loading the model. Try again shortly.")
                : new GenerationError("GENERATION_FAILED", "Ollama could not generate a response.");
          }
          return response;
        } catch (error) {
          if (!signal.aborted) upstreamError = new GenerationError("OLLAMA_UNAVAILABLE", "Ollama is unavailable. Check the backend connection.");
          throw error;
        }
      },
    });
    try {
      signal.throwIfAborted();
      emit({ type: "data-status", data: { state: "loading" }, transient: true });
      const result = streamText({
        model: provider.chat(model),
        system: ASSISTANT_INSTRUCTIONS,
        tools: createAssistantTools({ context: request.dashboardContext, analytics: options.analytics, signal,
          onTool: (name) => emit({ type: "data-status", data: { state: "tool", name }, transient: true }),
        }),
        stopWhen: stepCountIs(3),
        prepareStep: ({ stepNumber }) => stepNumber >= 2 ? { activeTools: [], toolChoice: "none" } : {},
        messages: request.messages.map((message) => ({
          role: message.role,
          content: message.parts.map((part) => part.text).join("\n"),
        })),
        abortSignal: signal,
        maxRetries: 0,
        // The session reports safe errors; SDK defaults would log prompts/upstream bodies.
        onError: () => {},
        maxOutputTokens: 1024,
        providerOptions: { ollama: { think: false, options: { num_ctx: 8192, num_predict: 1024 } } },
      });
      const reader = toUIMessageStream({ stream: result.stream, sendReasoning: false, onError: () => "Assistant generation failed." }).getReader();
      let generating = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          signal.throwIfAborted();
          if (value.type === "error") throw upstreamError ?? new GenerationError("GENERATION_FAILED", "Ollama could not generate a response.");
          if (value.type === "text-delta" && !generating) {
            generating = true;
            emit({ type: "data-status", data: { state: "generating" }, transient: true });
          }
          // Tools execute only on the backend. Keep client history text-only and
          // never accept a replayed tool result from the browser as evidence.
          if (["start", "text-start", "text-delta", "text-end", "finish", "abort"].includes(value.type)) emit(value);
        }
        if (!generating && !signal.aborted) throw new GenerationError("GENERATION_FAILED", "Ollama returned no text. Try again.");
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    } catch (error) {
      if (signal.aborted) throw error;
      throw upstreamError ?? (error instanceof GenerationError ? error : new GenerationError("GENERATION_FAILED", "Ollama could not generate a response."));
    }
  };
}
