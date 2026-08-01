import { martianMono } from "@/app/fonts";
import clsx from "clsx";
import { PulseIcon } from "./PulseIcon";

export default function Logo() {
  return (
    <div
      className={clsx(
        martianMono.className,
        "flex items-center gap-2 font-bold text-[15px] tracking-[-0.06em]",
      )}
    >
      <PulseIcon />
      WIKIPULSE
    </div>
  );
}
