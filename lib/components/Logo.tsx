import Link from "next/link";
import { PulseIcon } from "./PulseIcon";

export function Logo() {
  return (
    <Link href="/">
      <div className="font-display flex items-center gap-2 font-bold text-[15px] tracking-[-0.06em]">
        <PulseIcon />
        WIKIPULSE
      </div>
    </Link>
  );
}
