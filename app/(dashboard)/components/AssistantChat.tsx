"use client";

import { useChat } from "@ai-sdk/react";
import { IconMessageCircle, IconMinus, IconSend, IconSquare, IconTrash } from "@tabler/icons-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AssistantWebSocketTransport } from "@/lib/assistant/websocket-transport";
import { parseDashboardSearchParams, searchParamsFromURLSearchParams } from "@/lib/queries/dashboardSearchParams";
import { usePathname } from "next/navigation";
import AssistantMarkdown from "@/lib/assistant/AssistantMarkdown";

function assistantUrl() {
  return `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/assistant-ws`;
}

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b59e8]";
const suggestions = [
  { label: "Summarize activity", prompt: "Summarize collected activity for my current dashboard period and filters.", dashboard: true },
  { label: "Compare with previous period", prompt: "Compare collected activity in my current dashboard period with the preceding equal-length period, keeping the same filters. Include calculated differences and any coverage limitations.", dashboard: true },
  { label: "Show recent events", prompt: "Show the 5 newest stored events matching my current dashboard period and filters.", dashboard: true },
  { label: "Show activity over time", prompt: "Show how collected activity changed over my current dashboard period. Mention the effective bucket interval.", dashboard: true },
  { label: "Find the busiest pages", prompt: "Show the top 5 pages by collected event count for my current dashboard period and filters.", dashboard: true },
  { label: "Break down by language", prompt: "Break down collected events by wiki language for my current dashboard period and filters. Show the top 5 and their percentages.", dashboard: true },
  { label: "Break down by event type", prompt: "Break down collected events by event type for my current dashboard period and filters.", dashboard: true },
  { label: "Explain my filters", prompt: "Explain my current dashboard filters and the time period they cover.", dashboard: true },
  { label: "Check data freshness", prompt: "How fresh is the stored Wikipedia data? Explain what the latest event can and cannot tell us about collection status.", dashboard: false },
  { label: "What can I ask?", prompt: "What can you help me with in WikiPulse, and what are your limitations?", dashboard: false },
];

export default function AssistantChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("Connecting…");
  const [transport] = useState(() => new AssistantWebSocketTransport({ url: assistantUrl,
    getDashboardContext: () => window.location.pathname === "/dashboard"
      ? parseDashboardSearchParams(searchParamsFromURLSearchParams(new URLSearchParams(window.location.search)))
      : undefined,
  }));
  const id = useId();
  const composer = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, error, stop, setMessages, clearError } = useChat({
    transport,
    onData: (part) => {
      if (part.type === "data-status" && part.data && typeof part.data === "object" && "state" in part.data) {
        setPhase(part.data.state === "generating" ? "Replying…" : part.data.state === "tool" ? "Checking platform information…" : "Preparing a reply…");
      }
    },
  });
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => () => transport.close(), [transport]);
  useEffect(() => { if (open) composer.current?.focus(); }, [open]);
  useEffect(() => {
    if (open && transcript.current) transcript.current.scrollTop = messages.length ? transcript.current.scrollHeight : 0;
  }, [messages, open]);

  function collapse() {
    setOpen(false);
    launcher.current?.focus();
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    clearError();
    setPhase("Connecting…");
    setInput("");
    void sendMessage({ text });
  }
  function clear() {
    if (busy) return;
    setMessages([]);
    clearError();
    setInput("");
    composer.current?.focus();
  }
  const suggestedQuestions = <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
    {suggestions.filter((suggestion) => !suggestion.dashboard || pathname === "/dashboard").map((suggestion) => <button key={suggestion.label} type="button" disabled={busy} onClick={(event) => {
      setInput(suggestion.prompt);
      event.currentTarget.closest("details")?.removeAttribute("open");
      composer.current?.focus();
    }} className={`min-h-11 rounded-xl border border-[#e3e8f0] bg-white px-3 py-2 text-left text-xs leading-relaxed text-[#0e1630] hover:border-[#2b59e8] hover:bg-[#f5f7fb] disabled:opacity-40 ${focus}`}>{suggestion.label}</button>)}
  </div>;

  return (
    <div className="fixed right-3 bottom-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open && <section id={id} aria-label="WikiPulse AI assistant" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); collapse(); } }} className="flex h-[min(36rem,calc(100dvh-6.5rem))] w-[24rem] max-w-full flex-col overflow-hidden rounded-2xl border border-[#cdd5e2] bg-white text-[#0e1630] shadow-[0_16px_60px_#0e163026]">
        <header className="flex shrink-0 items-center gap-3 border-b border-[#e3e8f0] px-4 py-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#edf2ff] text-[#2b59e8]"><IconMessageCircle size={20} aria-hidden /></span>
          <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">WikiPulse assistant</h2><p className="text-xs text-[#5a6478]">AI chat · Powered by Ollama</p></div>
          <button type="button" onClick={clear} disabled={busy || (!messages.length && !error && !input)} aria-label="Clear conversation" title="Clear conversation" className={`rounded-lg p-2 text-[#5a6478] hover:bg-[#f5f7fb] disabled:opacity-35 ${focus}`}><IconTrash size={18} aria-hidden /></button>
          <button type="button" onClick={collapse} aria-label="Minimize assistant" title="Minimize assistant" className={`rounded-lg p-2 text-[#5a6478] hover:bg-[#f5f7fb] ${focus}`}><IconMinus size={18} aria-hidden /></button>
        </header>
        <p className="shrink-0 border-b border-[#e3e8f0] bg-[#f5f7fb] px-4 py-2 text-xs leading-relaxed text-[#5a6478]">Questions about dashboard data and collected Wikipedia activity only. Read-only access. Responses may be inaccurate. Conversation clears on reload.</p>
        <div ref={transcript} role="log" aria-label="Conversation" aria-live="off" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
          {!messages.length && <div className="py-2"><p className="text-base font-semibold">How can I help?</p><p className="mt-2 mb-4 text-sm leading-relaxed text-[#5a6478]">Choose a question, edit it if you like, then send.</p>{suggestedQuestions}</div>}
          {messages.map((message) => <div key={message.id} className={message.role === "user" ? "ml-6" : "mr-4"}>
            <p className="mb-1.5 text-[11px] font-semibold text-[#5a6478]">{message.role === "user" ? "You" : "Assistant"}</p>
            <div className={`whitespace-pre-wrap rounded-xl px-3 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] ${message.role === "user" ? "bg-[#2b59e8] text-white" : "bg-[#f5f7fb] text-[#0e1630]"}`}>
              {message.role === "assistant"
                ? <AssistantMarkdown>{message.parts.filter((part) => part.type === "text").map((part) => part.text).join("")}</AssistantMarkdown>
                : message.parts.filter((part) => part.type === "text").map((part, index) => <span key={index}>{part.text}</span>)}
            </div>
          </div>)}
        </div>
        <div role="status" aria-live="polite" className="shrink-0 px-4 pb-2 text-xs text-[#5a6478]">{busy ? phase : error ? "Connection or response failed" : messages.length ? "Ready for your next question" : "Ready to chat"}</div>
        {error && <p role="alert" className="mx-4 mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800">{error.message} You can send a new message or clear this conversation.</p>}
        <form onSubmit={submit} className="shrink-0 border-t border-[#e3e8f0] p-3">
          {messages.length > 0 && <details className="mb-2"><summary className={`min-h-8 cursor-pointer rounded-lg py-1 text-xs font-medium text-[#2b59e8] ${focus}`}>Suggested questions</summary><div className="max-h-40 overflow-y-auto overscroll-contain pt-1 pb-2">{suggestedQuestions}</div></details>}
          <label htmlFor={`${id}-input`} className="sr-only">Message the assistant</label>
          <textarea ref={composer} id={`${id}-input`} value={input} onChange={(event) => setInput(event.target.value)} maxLength={4000} rows={2} placeholder="Ask about dashboard data…" onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
          }} className={`block max-h-32 min-h-16 w-full resize-none rounded-xl border border-[#cdd5e2] bg-white px-3 py-2 text-sm ${focus}`} />
          <div className="mt-2 flex items-center justify-between gap-3"><span className="text-[11px] text-[#5a6478]">Enter to send · Shift+Enter for a new line</span>
            {busy ? <button type="button" onClick={() => { void stop(); }} className={`inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#cdd5e2] px-3 text-sm font-medium ${focus}`}><IconSquare size={14} aria-hidden />Stop</button> : <button type="submit" disabled={!input.trim()} className={`inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#2b59e8] px-3 text-sm font-medium text-white hover:bg-[#2148c2] disabled:opacity-40 ${focus}`}><IconSend size={16} aria-hidden />Send</button>}
          </div>
        </form>
      </section>}
      <button ref={launcher} type="button" aria-expanded={open} aria-controls={id} onClick={() => open ? collapse() : setOpen(true)} className={`inline-flex min-h-12 items-center gap-2 rounded-full bg-[#2b59e8] px-5 text-sm font-semibold text-white shadow-lg hover:bg-[#2148c2] ${focus}`}><IconMessageCircle size={20} aria-hidden />{open ? "Close assistant" : "Ask AI"}</button>
    </div>
  );
}
