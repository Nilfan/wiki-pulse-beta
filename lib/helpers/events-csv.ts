import type { RecentEvent } from "@/lib/queries/recentEvents";

/** Quote every value and keep user-controlled titles from becoming formulas. */
function cell(value: string) {
  const safe = /^[\s]*[=+\-@\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function eventsCsv(events: readonly RecentEvent[], timeZone?: string) {
  const formatter = timeZone ? new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }) : undefined;
  return [
    [`Timestamp (${timeZone ?? "UTC"})`, "Type", "Page", "Wiki", "Language"],
    ...events.map(event => [formatter ? formatter.format(new Date(event.timestamp)) : event.timestamp, event.type, event.path, event.host, event.country ?? ""]),
  ].map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
