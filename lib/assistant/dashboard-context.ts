import * as v from "valibot";
import { RANGE_OPTIONS, INTERVAL_OPTIONS, GROUP_BY_OPTIONS } from "../queries/constants";
import { getCustomPeriodError } from "../queries/timeWindow";

const values = v.pipe(v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(512))), v.maxLength(50));
export const dashboardContextSchema = v.pipe(v.strictObject({
  range: v.picklist([...RANGE_OPTIONS, "custom"]),
  start: v.optional(v.pipe(v.string(), v.maxLength(32))),
  end: v.optional(v.pipe(v.string(), v.maxLength(32))),
  interval: v.picklist(INTERVAL_OPTIONS),
  eventType: values,
  page: values,
  country: values,
  groupBy: v.pipe(v.array(v.picklist(GROUP_BY_OPTIONS)), v.maxLength(3)),
}), v.check((context) => context.range !== "custom" || !getCustomPeriodError(context.start, context.end)));
export type DashboardContext = v.InferOutput<typeof dashboardContextSchema>;
