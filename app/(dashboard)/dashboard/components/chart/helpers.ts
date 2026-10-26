import { REFRESH_INTERVAL_MINUTES } from "./constants";

export function getPreviousEventsRefreshTime(): number {
  const date = new Date();
  date.setMilliseconds(0);
  date.setSeconds(0);
  date.setMinutes(
    date.getMinutes() - (date.getMinutes() % REFRESH_INTERVAL_MINUTES),
  );
  return date.getTime();
}
