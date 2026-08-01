import clsx from "clsx";
import { PlansTable } from "./components/PlansTable";
import { interTight, martianMono } from "@/app/fonts";
import { NotesTable } from "./components/NotesTable";

export default function MarketingPage() {
  return (
    <div>
      <section className="px-0 pt-[clamp(46px,6vw,80px)] pb-[clamp(28px,3vw,40px)]">
        <div className="max-w-maxw mx-auto my-0 py-0 px-gut">
          <p
            className={clsx(
              martianMono.className,
              "text-[10.5px] font-medium tracking-[0.16em] uppercase text-ink-soft mx-0 mt-0 mb-4.5",
            )}
          >
            Pricing
          </p>
          <h1
            className={clsx(
              martianMono.className,
              "font-bold text-[clamp(26px,3.4vw,42px)] tracking-[-0.075em] mx-0 mt-0 mb-4 max-w-[16ch]",
            )}
          >
            Priced on events, not seats.
          </h1>
          <p
            className={clsx(
              interTight.className,
              "text-[clamp(16px,1.5vw,18px)] text-ink-soft max-w-[46ch] m-0",
            )}
          >
            Invite the whole team on any plan. You pay for what you send, and
            the counter resets every month.
          </p>
        </div>
      </section>

      <div className="max-w-maxw mx-auto my-0 py-0 px-gut">
        <PlansTable />
        <NotesTable />
      </div>
    </div>
  );
}
