"use client";

import clsx from "clsx";
import { IconRefresh } from "@tabler/icons-react";

type Props = {
  onClick: () => void;
  isLoading: boolean;
};

export default function RefreshButton({ onClick, isLoading }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      aria-label="Refresh data"
      title="Refresh data"
      className="flex size-8.5 items-center justify-center border border-hair bg-card text-ink-soft hover:text-ink disabled:cursor-wait disabled:text-ink-3"
    >
      <IconRefresh
        size={15}
        stroke={1.6}
        aria-hidden
        className={clsx(isLoading && "animate-spin motion-reduce:animate-none")}
      />
    </button>
  );
}
