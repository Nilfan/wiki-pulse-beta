import clsx from "clsx";

const skeletonRows = Array.from({ length: 10 });

const SkeletonBar = ({ className }: { className: string }) => (
  <span className={clsx("block bg-paper-deep", className)} />
);

export const FeedListSkeleton = () => (
  <div
    aria-hidden="true"
    className="font-data h-75.5 overflow-hidden animate-pulse"
  >
    {skeletonRows.map((_, index) => (
      <div
        key={index}
        className="grid grid-cols-[60px_74px_1fr_30px] gap-2 items-center px-3 py-1.75 border-b border-b-[#EDEFEA]"
      >
        <SkeletonBar className="h-3 w-13" />
        <SkeletonBar className="h-5 w-full border border-rule bg-transparent" />
        <SkeletonBar
          className={clsx("h-3", index % 3 === 0 ? "w-4/5" : "w-3/5")}
        />
        <SkeletonBar className="h-3 w-5 ml-auto" />
      </div>
    ))}
  </div>
);

export const TotalEventCountSkeleton = () => (
  <span
    aria-hidden="true"
    className="inline-block h-8 w-30 shrink-0 animate-pulse bg-paper-deep"
  />
);
