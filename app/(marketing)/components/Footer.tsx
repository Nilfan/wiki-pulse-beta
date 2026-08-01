import { jetBrainsMono } from "@/app/fonts";
import clsx from "clsx";
import Logo from "./Logo";

export default function Footer() {
  return (
    <div className="border-t border-t-rule px-0 pt-6.5 pb-10">
      <div
        className={clsx(
          jetBrainsMono.className,
          "max-w-maxw mx-auto my-0 px-gut py-0 flex flex-wrap gap-3.5 items-center text-[11.5px] text-ink-faint",
        )}
      >
        <Logo />

        <span className="ml-auto">Pet-project · not a real product</span>
      </div>
    </div>
  );
}
