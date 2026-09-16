"use client";

import { formatGroupValue } from "../chart/chartSeries";
import SearchableFilter from "./SearchableFilter";

const formatEventType = (value: string) => value;
const formatPage = (value: string) => formatGroupValue("page", value);
const formatCountry = (value: string) => formatGroupValue("country", value);

/** One searchable filter per groupBy dimension, in the same order. */
export default function ValueFilters() {
  return (
    <>
      <SearchableFilter
        param="eventType"
        dimension="event"
        name="event"
        menuLabel="Event types"
        formatLabel={formatEventType}
      />
      <SearchableFilter
        param="page"
        dimension="page"
        name="page"
        menuLabel="Pages"
        formatLabel={formatPage}
      />
      <SearchableFilter
        param="country"
        dimension="country"
        name="language"
        menuLabel="Languages"
        formatLabel={formatCountry}
      />
    </>
  );
}
