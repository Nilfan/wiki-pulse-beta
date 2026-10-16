"use client";

import { useId, useRef, useState } from "react";

const pad = (value: number) => String(value).padStart(2, "0");
const datePart = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
};

export default function DateTimePicker({ id, label, value, onChange, invalid, describedBy }: Props) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs">{label}</label>
      <button
        ref={trigger}
        id={id}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-calendar`}
        aria-describedby={describedBy}
        onClick={() => setOpen((previous) => !previous)}
        className={`w-full border ${invalid ? "border-brand" : "border-ink"} bg-white px-2.5 py-2 text-left text-[13px] focus-visible:outline-2 focus-visible:outline-signal`}
      >
        {value.replace("T", " · ")} <span aria-hidden="true" className="float-right">▾</span>
      </button>
      {open && (
        <div id={`${id}-calendar`} onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
        }}>
          <CalendarEditor label={label} value={value} onCancel={close} onApply={(nextValue) => { onChange(nextValue); close(); }} />
        </div>
      )}
    </div>
  );
}

function CalendarEditor({ label, value, onCancel, onApply }: {
  label: string;
  value: string;
  onCancel: () => void;
  onApply: (value: string) => void;
}) {
  const timeId = useId();
  const [selectedDate, setSelectedDate] = useState(value.slice(0, 10));
  const [time, setTime] = useState(value.slice(11) || "00:00:00");
  const [month, setMonth] = useState(() => new Date(`${value.slice(0, 10)}T12:00:00`));
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (monthStart.getDay() + 6) % 7;
  const monthLabel = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const days = Array.from({ length: 42 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - offset + 1));

  return (
    <section aria-label={`${label} date picker`} className="mt-1 border border-rule bg-paper p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="px-2 py-1 hover:bg-paper-deep">‹</button>
        <p aria-live="polite" className="text-xs font-medium">{monthLabel}</p>
        <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="px-2 py-1 hover:bg-paper-deep">›</button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs">
        {weekdays.map((day) => <span key={day} className="py-1 text-ink-soft">{day}</span>)}
        {days.map((day) => {
          const date = datePart(day);
          const selected = selectedDate === date;
          return (
            <button
              key={date}
              type="button"
              aria-label={day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              aria-pressed={selected}
              onClick={() => setSelectedDate(date)}
              className={`py-1.5 focus-visible:outline-2 focus-visible:outline-signal ${selected ? "bg-signal text-white" : day.getMonth() === month.getMonth() ? "hover:bg-paper-deep" : "text-ink-soft hover:bg-paper-deep"}`}
            >{day.getDate()}</button>
          );
        })}
      </div>
      <label htmlFor={timeId} className="mt-3 block text-xs">Time</label>
      <input id={timeId} type="time" step="1" value={time} onChange={(event) => setTime(event.target.value)} className="mt-1 w-full border border-rule bg-white px-2 py-1.5 text-sm" />
      <div className="mt-3 flex justify-end gap-2 border-t border-rule pt-2">
        <button type="button" aria-label={`Cancel ${label.toLowerCase()} date selection`} onClick={onCancel} className="border border-ink px-3 py-1.5 text-xs hover:bg-paper-deep">Cancel</button>
        <button type="button" aria-label={`Apply ${label.toLowerCase()} date selection`} disabled={!selectedDate || !time} onClick={() => onApply(`${selectedDate}T${time.length === 5 ? `${time}:00` : time}`)} className="border border-ink bg-ink px-3 py-1.5 text-xs text-paper hover:bg-signal disabled:opacity-50">Apply</button>
      </div>
    </section>
  );
}
