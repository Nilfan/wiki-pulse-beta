"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { jetBrainsMono } from "@/app/fonts";

export default function ControlTab({
  title,
  link,
  prefetch = false,
}: {
  title: string;
  link: string;
  prefetch?: boolean;
}) {
  const pathname = usePathname();

  return (
    <Link href={link} prefetch={prefetch}>
      <button
        className={clsx(
          jetBrainsMono.className,
          {
            ["text-ink border-rule bg-shell"]: pathname === link,
            ["text-ink-soft border-transparent bg-none"]: pathname !== link,
          },

          "text-[12.5px] tracking-[0.02em]  py-1.75 px-2.75 border border-solid ",
        )}
      >
        {title}
      </button>
    </Link>
  );
}
