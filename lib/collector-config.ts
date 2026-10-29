/** Shared by the Deno collector and the public pipeline explanation. */
export const MAX_EVENTS_PER_ONE_MINUTE = 60; // events per minute
export const FLUSH_TIMEOUT_MINUTES = 2;

export const MAX_BATCH_CAPACITY =
  MAX_EVENTS_PER_ONE_MINUTE * FLUSH_TIMEOUT_MINUTES;
export const BATCH_ADD_THROTTLE_MS = (60 * 1000) / MAX_EVENTS_PER_ONE_MINUTE;
export const FLUSH_TIMEOUT_MS = FLUSH_TIMEOUT_MINUTES * 60 * 1000;
export const CLEARANCE_DB_PERIOD_DAYS = 21;
export const CLEARANCE_PERIOD_HOURS = 6;

export const FORCE_DEV_DB = false;
