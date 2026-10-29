const BOTTOM_TOLERANCE = 4;

export type TranscriptScrollState = { following: boolean; top: number };

/** Owns scrolling independently of React renders and streamed message updates. */
export function attachTranscriptScroll(
  viewport: HTMLDivElement,
  content: HTMLDivElement,
  state: TranscriptScrollState,
) {
  let height = viewport.scrollHeight;
  let clientHeight = viewport.clientHeight;
  let touchY: number | undefined;
  let inputPending = false;
  let anchor: { element: Element; offset: number } | undefined;

  const rememberAnchor = () => {
    const top = viewport.getBoundingClientRect().top;
    // Prefer rendered text blocks over an entire potentially long message.
    const elements = content.querySelectorAll("p, li, pre, table, h1, h2, h3, h4, [data-chat-message]");
    const visible = Array.from(elements).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.bottom > top && rect.top < top + viewport.clientHeight;
    });
    const element = visible.find((candidate) => !candidate.hasAttribute("data-chat-message")) ?? visible[0];
    anchor = element ? { element, offset: element.getBoundingClientRect().top - top } : undefined;
  };

  const atBottom = () =>
    viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= BOTTOM_TOLERANCE;

  const resize = () => {
    if (inputPending && viewport.scrollTop !== state.top) {
      // Input can land in the same frame as new content, before scroll fires.
      // Capture the user's new reading position, not the old anchor.
      state.following = height - clientHeight - viewport.scrollTop <= BOTTOM_TOLERANCE;
      state.top = viewport.scrollTop;
      rememberAnchor();
      inputPending = false;
    }
    // A user scroll can precede its scroll event. Respect it before writing.
    if (viewport.scrollTop < state.top && viewport.scrollHeight >= height
      && viewport.clientHeight === clientHeight) {
      state.following = false;
      rememberAnchor();
    }
    if (state.following) {
      // No smooth animation or queued frame may compete with user input.
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "instant" });
    } else if (anchor?.element.isConnected) {
      // Also anchor explicitly for browsers without native scroll anchoring.
      // If the browser already compensated, this delta is zero.
      const delta = anchor.element.getBoundingClientRect().top
        - viewport.getBoundingClientRect().top - anchor.offset;
      if (Math.abs(delta) > 0.5) {
        viewport.scrollTo({ top: viewport.scrollTop + delta, behavior: "instant" });
      }
    }
    state.top = viewport.scrollTop;
    height = viewport.scrollHeight;
    clientHeight = viewport.clientHeight;
    rememberAnchor();
  };

  const scroll = () => {
    if (viewport.scrollHeight !== height || viewport.clientHeight !== clientHeight) {
      // Layout changed before ResizeObserver ran. Use the PREVIOUS following
      // state, rather than treating the new distance from the bottom as input.
      resize();
      return;
    }
    if (viewport.scrollTop === state.top) return; // Our own scroll event.
    state.following = atBottom();
    state.top = viewport.scrollTop;
    inputPending = false;
    rememberAnchor();
  };
  const wheel = (event: WheelEvent) => {
    inputPending = true;
    if (event.deltaY < 0) state.following = false;
  };
  const touchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY; };
  const touchMove = (event: TouchEvent) => {
    inputPending = true;
    const nextY = event.touches[0]?.clientY;
    if (nextY !== undefined && touchY !== undefined && nextY > touchY) state.following = false;
    touchY = nextY;
  };
  const keyDown = (event: KeyboardEvent) => {
    inputPending = true;
    if (["ArrowUp", "PageUp", "Home"].includes(event.key)
      || (event.key === " " && event.shiftKey)) state.following = false;
  };
  const pointerDown = (event: PointerEvent) => {
    // Scrollbar dragging does not produce wheel/touch events.
    if (event.target === viewport) inputPending = true;
  };

  viewport.scrollTo({ top: state.top, behavior: "instant" });
  // Initial mounting may clamp a saved position after the conversation clears.
  state.top = viewport.scrollTop;
  resize();
  viewport.addEventListener("scroll", scroll, { passive: true });
  viewport.addEventListener("wheel", wheel, { passive: true });
  viewport.addEventListener("touchstart", touchStart, { passive: true });
  viewport.addEventListener("touchmove", touchMove, { passive: true });
  viewport.addEventListener("keydown", keyDown);
  viewport.addEventListener("pointerdown", pointerDown);
  const observer = new ResizeObserver(resize);
  observer.observe(content);
  observer.observe(viewport);
  return () => {
    observer.disconnect();
    viewport.removeEventListener("scroll", scroll);
    viewport.removeEventListener("wheel", wheel);
    viewport.removeEventListener("touchstart", touchStart);
    viewport.removeEventListener("touchmove", touchMove);
    viewport.removeEventListener("keydown", keyDown);
    viewport.removeEventListener("pointerdown", pointerDown);
  };
}
