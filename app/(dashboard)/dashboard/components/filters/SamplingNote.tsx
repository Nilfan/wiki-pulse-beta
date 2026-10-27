"use client";

import { useEffect, useId, useRef, useState } from "react";
import { IconInfoCircle } from "@tabler/icons-react";

export default function SamplingNote() {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      clearTimeout(closeTimer.current);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative ml-auto max-w-full" onPointerEnter={event => { clearTimeout(closeTimer.current); if (event.pointerType === "mouse") setOpen(true); }} onPointerLeave={() => { if (!ref.current?.contains(document.activeElement)) closeTimer.current = setTimeout(() => setOpen(false), 200); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <div className="flex items-center gap-2 rounded-xl bg-[#fff8e8] px-3 py-2.5 text-xs leading-relaxed text-[#8a5a00]">
        <IconInfoCircle size={16} className="shrink-0" aria-hidden />
        <span>Sampled data — not total Wikipedia activity. <button type="button" aria-label="Why is the data sampled?" aria-expanded={open} aria-describedby={open ? id : undefined} onFocus={() => setOpen(true)} onClick={() => setOpen(true)} className="rounded font-semibold underline decoration-dotted underline-offset-4 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a5a00]">Why?</button></span>
      </div>
      {open && <div id={id} role="tooltip" className="absolute right-0 bottom-[calc(100%+10px)] z-50 w-72 max-w-[calc(100vw-3rem)] rounded-2xl border border-hair bg-white p-4 text-sm leading-relaxed text-ink-soft shadow-[0_12px_36px_-8px_rgba(14,22,48,0.2)]">
        <p className="mb-1 font-semibold text-ink">Why sampled data?</p>
        <p>WikiPulse keeps a limited sample of the public event stream. Totals reflect stored events, not all Wikipedia activity.</p>
      </div>}
    </div>
  );
}
