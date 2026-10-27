"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Keep menus within the viewport while retaining their trigger's focus boundary. */
export default function FilterPopover({ children, width = 256, id, role, label }: {
  children: ReactNode;
  width?: number;
  id?: string;
  role?: "dialog" | "menu";
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const panel = ref.current;
    const anchor = panel?.parentElement;
    if (!panel || !anchor) return;

    function position() {
      if (!panel || !anchor) return;
      const rect = anchor.getBoundingClientRect();
      const margin = 16;
      const gap = 8;
      const panelWidth = Math.min(width, window.innerWidth - margin * 2);
      panel.style.width = `${panelWidth}px`;
      const below = window.innerHeight - rect.bottom - margin - gap;
      const above = rect.top - margin - gap;
      const openAbove = below < Math.min(panel.scrollHeight, 240) && above > below;
      const available = Math.max(0, openAbove ? above : below);
      panel.style.maxHeight = `${Math.min(available, window.innerHeight * 0.7)}px`;
      panel.style.left = `${Math.max(margin, Math.min(rect.left, window.innerWidth - panelWidth - margin))}px`;
      panel.style.top = `${openAbove ? Math.max(margin, rect.top - panel.offsetHeight - gap) : rect.bottom + gap}px`;
    }

    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [children, width]);

  return <div ref={ref} id={id} role={role} aria-label={label} data-filter-popover className="fixed z-50 overflow-y-auto overscroll-contain rounded-2xl border border-hair bg-white p-2 text-ink shadow-[0_16px_48px_-12px_rgba(14,22,48,0.22)]">{children}</div>;
}
