import Link from "next/link";

export function MarketingHeader({ activePage }: { activePage: "product" | "flow" }) {
  return (
    <header className="bg-white border-b border-b-[#e3e8f0]">
      <div className="max-w-300 mx-auto my-0 py-4 px-6 flex flex-wrap gap-4 items-center justify-between max-[640px]:py-4 max-[640px]:px-5 max-[640px]:gap-3">
        <Link href="/" className="flex items-center gap-2.5 no-underline text-[#0e1630]">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#2B59E8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 15h6l3-9 5 17 3-8h7" />
          </svg>
          <span className="[font-family:var(--font-inter-tight),_sans-serif] font-bold text-[21px]">WikiPulse</span>
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-2 max-[640px]:w-full max-[640px]:justify-between max-[640px]:gap-0">
          <Link href="/" aria-current={activePage === "product" ? "page" : undefined} className={activePage === "product" ? "py-3 px-3 text-[15px] font-semibold text-[#2b59e8] no-underline max-[640px]:py-3 max-[640px]:px-2 max-[640px]:text-[14px]" : "py-3 px-3 text-[15px] text-[#4a5468] no-underline max-[640px]:py-3 max-[640px]:px-2 max-[640px]:text-[14px]"}>Product</Link>
          <Link href="/flow" aria-current={activePage === "flow" ? "page" : undefined} className={activePage === "flow" ? "py-3 px-3 text-[15px] font-semibold text-[#2b59e8] no-underline max-[640px]:py-3 max-[640px]:px-2 max-[640px]:text-[14px]" : "py-3 px-3 text-[15px] text-[#4a5468] no-underline max-[640px]:py-3 max-[640px]:px-2 max-[640px]:text-[14px]"}>How it works</Link>
          <Link href="/dashboard" className="inline-flex items-center gap-2 h-11 py-0 px-4.5 rounded-[10px] bg-[#0e1630] text-white text-[15px] font-semibold no-underline max-[640px]:py-0 max-[640px]:px-3 max-[640px]:text-[14px]">
            Open dashboard
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </nav>
      </div>
    </header>
  );
}
