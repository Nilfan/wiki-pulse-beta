import { jetBrainsMono, martianMono } from "@/app/fonts";
import clsx from "clsx";
import { JSX } from "react";

const PLANS: {
  name: string;
  description: string;
  price: string;
  paymentPeriod: string;
  quotaTooltip: JSX.Element;
  planContent: string[];
  ctaText: string;
  extraBadge?: string;
  isHighlighted?: boolean;
}[] = [
  {
    name: "Free",
    description:
      "For a side project, or checking whether tracking works at all.",
    price: "$0",
    paymentPeriod: "forever",
    quotaTooltip: (
      <>
        <b>10,000</b> events / month
      </>
    ),
    planContent: [
      "Unlimited teammates",
      "Live event stream",
      "30 days of history",
      "Funnels",
      "CSV export",
    ],
    ctaText: "Start free",
  },

  {
    isHighlighted: true,
    name: "Pro",
    extraBadge: "Most teams",
    description: "For a product with users you're accountable to.",
    price: "$19",
    paymentPeriod: "per month, billed monthly",
    quotaTooltip: (
      <>
        <b>1,000,000</b> events / month{" "}
      </>
    ),
    planContent: [
      "Everything in Free",
      "Funnels and retention",
      "2 years of history",
      "CSV export and API access",
      "Alerts on any metric",
    ],
    ctaText: "Choose Pro",
  },
  {
    name: "Enterprise",
    description: "For volume, or when the data has to live somewhere specific.",
    price: "Talk",
    paymentPeriod: "annual agreement",
    quotaTooltip: (
      <>
        Volume above <b>1M</b> / month{" "}
      </>
    ),
    planContent: [
      "Everything in Pro",
      "Choose where data is stored",
      "Unlimited history",
      "SSO and audit log",
      "Named support contact",
    ],
    ctaText: "Contact sales",
  },
];

export const PlansTable = () => (
  <div className="grid grid-cols-1 min-[901px]:grid-cols-3 [&>*:last-child]:border-r-0 border-t border-t-ink border-b border-b-ink">
    {PLANS.map(
      ({
        ctaText,
        description,
        name,
        paymentPeriod,
        planContent,
        price,
        quotaTooltip,
        extraBadge,
        isHighlighted,
      }) => (
        <div
          className={clsx(
            "px-6 pt-7 pb-7.5 flex flex-col min-[901px]:border-r border-r-rule",
            { ["bg-shell"]: isHighlighted },
          )}
          key={name}
        >
          <h2
            className={clsx(
              martianMono.className,
              "font-bold text-[14px] tracking-[-0.04em] mx-0 mt-0 mb-1 flex items-center gap-2.25",
            )}
          >
            {name}

            {extraBadge ? (
              <span
                className={clsx(
                  jetBrainsMono.className,
                  "text-[9.5px] tracking-[0.08em] uppercase text-signal border border-signal py-px px-1.5 font-normal",
                )}
              >
                {extraBadge}
              </span>
            ) : null}
          </h2>
          <p className="mx-0 mt-0 mb-5.5 text-[13.5px] text-ink-soft min-h-[2.6em]">
            {description}
          </p>
          <div
            className={clsx(
              jetBrainsMono.className,
              "font-bold text-[32px] tracking-[-.03em] leading-none tabular-nums",
            )}
          >
            {price}
          </div>
          <p
            className={clsx(
              jetBrainsMono.className,
              "text-[11.5px] text-ink-faint mx-0 mt-1.75 mb-5",
            )}
          >
            {paymentPeriod}
          </p>
          <p
            className={clsx(
              jetBrainsMono.className,
              "text-[12px] px-0 py-2.25 border-t border-t-rule border-b border-b-rule mb-4.5",
            )}
          >
            {quotaTooltip}
          </p>
          <ul className="mx-0 mt-0 mb-6.5 text-[14px] text-ink-soft">
            {planContent.map((rowText, i) => (
              <li
                key={i}
                className="pt-1.25 pl-0 pb-1.25 pr-4.25 relative leading-[1.45]"
              >
                - {rowText}
              </li>
            ))}
          </ul>
          <div
            className={clsx(
              jetBrainsMono.className,
              "mt-auto text-center text-[12.5px] px-3.5 py-2.75 border border-ink",
              { ["bg-ink text-paper"]: isHighlighted },
            )}
          >
            {ctaText}
          </div>
        </div>
      ),
    )}
  </div>
);
