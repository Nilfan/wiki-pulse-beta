"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { parseDashboardSearchParams, searchParamsFromURLSearchParams } from "@/lib/queries/dashboardSearchParams";
import { getCustomPeriodError } from "@/lib/queries/timeWindow";
import DateTimePicker from "./DateTimePicker";
import FilterBaseButton, { type FilterOption } from "./FilterBaseButton";
import { setDashboardSearchParams } from "./useDashboardFilter";

const OPTIONS = [
  { value: "15m", label: "15 min", description: "15 min" },
  { value: "1h", label: "1 hour", description: "60 min" },
  { value: "6h", label: "6 hours", description: "360 min" },
  { value: "12h", label: "12 hours", description: "720 min" },
  { value: "24h", label: "24 hours", description: "1440 min" },
  { value: "2d", label: "2 days", description: "2880 min" },
  { value: "3d", label: "3 days", description: "4320 min" },
  { value: "7d", label: "7 days", description: "10080 min" },
  { value: "14d", label: "14 days", description: "20160 min" },
  { value: "21d", label: "21 days", description: "30240 min" },
  { value: "60d", label: "60 days", description: "86400 min" },
  { value: "custom", label: "Custom period", separatorBefore: true },
] as const satisfies readonly FilterOption[];

/** datetime-local edits local wall time; URLs carry the corresponding UTC instant. */
function toLocalInput(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function CustomPeriodForm({ start, end, onApply, onCancel, onBack }: {
  start?: string;
  end?: string;
  onApply: (start: string, end: string) => void;
  onCancel: () => void;
  onBack: () => void;
}) {
  const id = useId();
  const [draftStart, setDraftStart] = useState(() => toLocalInput(start ?? new Date(Date.now() - 86400000).toISOString()));
  const [draftEnd, setDraftEnd] = useState(() => toLocalInput(end ?? new Date().toISOString()));
  const [error, setError] = useState<string | null>(null);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftStart || !draftEnd) {
      setError("Choose both a start and an end timestamp.");
      return;
    }
    const dates = [new Date(draftStart), new Date(draftEnd)];
    if (dates.some((date) => !Number.isFinite(date.getTime()))) {
      setError("Choose valid start and end timestamps.");
      return;
    }
    const [nextStart, nextEnd] = dates.map((date) => date.toISOString());
    const nextError = getCustomPeriodError(nextStart, nextEnd);
    setError(nextError);
    if (!nextError) onApply(nextStart, nextEnd);
  }

  return (
    <form onSubmit={apply} className="bg-shell p-3" aria-label="Custom period">
      <button type="button" onClick={onBack} className="mb-3 text-xs text-signal underline underline-offset-4">← Preset ranges</button>
      <h2 className="mb-3 font-display text-sm">Custom period</h2>
      <div className="flex flex-col gap-3">
        <DateTimePicker
          id={`${id}-start`}
          label="Start"
          value={draftStart}
          onChange={(value) => { setDraftStart(value); setError(null); }}
          invalid={Boolean(error)}
          describedBy={`${id}-help${error ? ` ${id}-error` : ""}`}
        />
        <DateTimePicker
          id={`${id}-end`}
          label="End"
          value={draftEnd}
          onChange={(value) => { setDraftEnd(value); setError(null); }}
          invalid={Boolean(error)}
          describedBy={`${id}-help${error ? ` ${id}-error` : ""}`}
        />
        <button type="submit" className="border border-ink bg-ink px-4 py-2 text-[13px] text-paper hover:bg-signal focus-visible:outline-2 focus-visible:outline-signal">Apply period</button>
        <button type="button" onClick={onCancel} className="border border-ink px-3 py-2 text-[13px] hover:bg-paper-deep">Cancel</button>
      </div>
      <p id={`${id}-help`} className="mt-2 text-xs text-ink-soft">Times in {Intl.DateTimeFormat().resolvedOptions().timeZone}. Start included, end excluded. Maximum span: 60 days.</p>
      {error && <p id={`${id}-error`} role="alert" className="mt-2 text-xs text-brand">{error}</p>}
    </form>
  );
}

export default function DateRangeFilter() {
  const pathname = usePathname();
  const rawParams = useSearchParams();
  const params = useMemo(() => parseDashboardSearchParams(searchParamsFromURLSearchParams(rawParams)), [rawParams]);
  const selectedRange = OPTIONS.find((option) => option.value === params.range);

  return (
    <FilterBaseButton
      name="range"
      value={selectedRange?.label ?? params.range}
      selectedValues={[params.range]}
      options={OPTIONS}
      onValueChange={([nextRange]) => {
        if (!nextRange) return;
        setDashboardSearchParams(pathname, { range: nextRange, start: [], end: [] });
      }}
      menuLabel="Date range"
      optionContent={{
        value: "custom",
        render: (close, showOptions) => (
          <CustomPeriodForm
            key={`${params.start ?? ""}:${params.end ?? ""}`}
            start={params.start}
            end={params.end}
            onCancel={close}
            onBack={showOptions}
            onApply={(start, end) => {
              setDashboardSearchParams(pathname, { range: "custom", start, end });
              close();
            }}
          />
        ),
      }}
    />
  );
}
