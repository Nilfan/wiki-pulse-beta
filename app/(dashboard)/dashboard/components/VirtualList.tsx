"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  count: number;
  /** Every row is exactly this tall, which is what makes the windowing cheap. */
  rowHeight: number;
  /** Viewport height, in rows. */
  visibleRows: number;
  renderRow: (index: number) => ReactNode;
  /** A row-high slot after the last row: a spinner, a retry, nothing. */
  footer?: ReactNode;
  /** Called once the viewport reaches within `endThreshold` rows of the end. */
  onEndReached?: () => void;
  endThreshold?: number;
  label: string;
  /**
   * "listbox" for a picker: each row then renders its own `role="option"`,
   * and the wrappers step out of the accessibility tree.
   */
  listRole?: "list" | "listbox";
  listId?: string;
  multiselectable?: boolean;
  /** Row kept scrolled into view, for keyboard navigation. */
  activeIndex?: number;
};

/** Rows rendered past each edge of the viewport, so a fast flick never shows a gap. */
const OVERSCAN = 6;

/**
 * Renders only the rows in view out of an arbitrarily long list. Rows are
 * absolutely positioned inside a spacer as tall as the whole list, so the
 * scrollbar stays true to the full length.
 */
export default function VirtualList({
  count,
  rowHeight,
  visibleRows,
  renderRow,
  footer,
  onEndReached,
  endThreshold = 10,
  label,
  listRole = "list",
  listId,
  multiselectable,
  activeIndex = -1,
}: Props) {
  const [scrollTop, setScrollTop] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  const height = rowHeight * visibleRows;
  const firstVisible = Math.floor(scrollTop / rowHeight);
  const lastVisible = Math.min(count - 1, firstVisible + visibleRows);
  const start = Math.max(0, firstVisible - OVERSCAN);
  const end = Math.min(count - 1, lastVisible + OVERSCAN);

  // Also fires when the list is shorter than its viewport, so a first page
  // that does not fill the box still pulls the next one in.
  const isNearEnd = lastVisible >= count - 1 - endThreshold;
  useEffect(() => {
    if (isNearEnd) onEndReached?.();
  }, [isNearEnd, count, onEndReached]);

  // Scrolls only as far as it takes, so moving within the view never jumps.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || activeIndex < 0) return;

    const top = activeIndex * rowHeight;
    if (top < viewport.scrollTop) {
      viewport.scrollTop = top;
    } else if (top + rowHeight > viewport.scrollTop + height) {
      viewport.scrollTop = top + rowHeight - height;
    }
  }, [activeIndex, rowHeight, height]);

  const isListbox = listRole === "listbox";
  const rows: ReactNode[] = [];
  for (let index = start; index <= end; index++) {
    rows.push(
      <li
        key={index}
        role={isListbox ? "none" : undefined}
        aria-setsize={isListbox ? undefined : -1}
        aria-posinset={isListbox ? undefined : index + 1}
        className="absolute inset-x-0"
        style={{ top: index * rowHeight, height: rowHeight }}
      >
        {renderRow(index)}
      </li>,
    );
  }

  return (
    <div
      ref={viewportRef}
      className="overflow-y-auto overscroll-contain"
      style={{ height }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <ul
        id={listId}
        role={isListbox ? "listbox" : undefined}
        aria-multiselectable={isListbox ? multiselectable : undefined}
        aria-label={label}
        className="relative"
        style={{ height: (count + (footer ? 1 : 0)) * rowHeight }}
      >
        {rows}
        {footer && (
          <li
            role={isListbox ? "none" : undefined}
            className="absolute inset-x-0"
            style={{ top: count * rowHeight, height: rowHeight }}
          >
            {footer}
          </li>
        )}
      </ul>
    </div>
  );
}
