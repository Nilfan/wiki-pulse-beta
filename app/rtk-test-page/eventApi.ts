import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type PreviewEvent = {
  id: number;
  timestamp: Date;
  type: string;
  path: string;
  country: string;
};

export const rtkTestApi = createApi({
  reducerPath: "rtk-test",
  tagTypes: ["Events"],
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:3000/api/rtk-test",
  }),

  endpoints: (build) => ({
    getRandomEvents: build.query<{ events: PreviewEvent[] }, void>({
      query: () => "random-events",
    }),
  }),
});

export const { useGetRandomEventsQuery } = rtkTestApi;
