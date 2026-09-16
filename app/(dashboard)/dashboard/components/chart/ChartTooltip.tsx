import type { TooltipContentProps } from "recharts";
import { formatTotal } from "./chartAxis";

type Props = TooltipContentProps;

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default function ChartTooltip({ active, payload, label }: Props) {
  if (!active || !payload?.length) return null;

  const total = payload.reduce((sum, item) => sum + Number(item.value ?? 0), 0);

  return (
    <div className="border border-ink bg-shell px-3 py-2 shadow-[3px_3px_0_0_var(--color-cell-border)]">
      <p className="font-data text-[11px] tracking-[0.08em] text-ink-3 uppercase">
        {TIMESTAMP_FORMATTER.format(new Date(Number(label)))}
      </p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {payload.map((item) => (
          <li
            key={item.dataKey as string}
            className="flex items-center gap-2 font-data text-[12px]"
          >
            <span
              aria-hidden
              className="size-2 shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-ink-soft">{item.name}</span>
            <span className="ml-auto pl-4 text-ink tabular-nums">
              {formatTotal(Number(item.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
      {payload.length > 1 && (
        <p className="mt-1.5 flex items-center justify-between gap-4 border-t border-hair pt-1.5 font-data text-[12px]">
          <span className="text-ink-3">total</span>
          <span className="text-ink tabular-nums">{formatTotal(total)}</span>
        </p>
      )}
    </div>
  );
}
