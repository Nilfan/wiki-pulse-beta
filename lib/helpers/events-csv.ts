import type { RecentEvent } from "@/lib/queries/recentEvents";

/** Quote every value and keep user-controlled titles from becoming formulas. */
function cell(value: string) {
  const safe = /^[\s]*[=+\-@\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function eventsCsv(events: readonly RecentEvent[]) {
  return [
    ["Timestamp (UTC)", "Type", "Page", "Wiki", "Language"],
    ...events.map(event => [event.timestamp, event.type, event.path, event.host, event.country ?? ""]),
  ].map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
