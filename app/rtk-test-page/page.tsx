"use client";
import { useGetRandomEventsQuery } from "./eventApi";
import { EventCards } from "./EventCards";

export default function RtkTestPage() {
  const { data, isLoading, isFetching, isError, refetch } =
    useGetRandomEventsQuery();

  console.log("data :>> ", data);

  return (
    <div className="flex gap-10 relative">
      <div>
        <button
          className="border bg-amber-200 text-black cursor-pointer border-amber-200 rounded-lg p-2"
          onClick={() => refetch()}
        >
          Refetch
        </button>
      </div>
      {isLoading || !data ? "Loading ..." : <EventCards events={data.events} />}
      {(isFetching || isLoading) && (
        <div className="absolute top-2.5 right-2.5 text-black p-3 rounded-lg bg-white">
          Please, wait...
        </div>
      )}
      {isError && <div className="text-2xl text-red-900"> :&gt;&gt;Error </div>}
    </div>
  );
}
