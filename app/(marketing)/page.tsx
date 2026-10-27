import type { Metadata } from "next";
import Link from "next/link";
import { marketingInter } from "@/app/fonts";
import { MarketingHeader } from "./components/MarketingHeader";


export const metadata: Metadata = {
  title: "WikiPulse — Wikipedia event analytics",
  description: "Explore a sampled stream of Wikipedia changes. See activity, spot patterns, and look behind the numbers.",
};

export default function MarketingPage() {
  return (
    <div className={`[font-family:var(--font-landing-inter),_system-ui,_sans-serif] text-[#0e1630] bg-[#f5f7fb] min-h-screen h-dvh overflow-y-auto [&_a]:[transition:background-color_150ms,_color_150ms,_box-shadow_150ms] [&_a:hover]:[filter:brightness(0.9)] [&_a:focus-visible]:[outline:3px_solid_#2b59e8] [&_a:focus-visible]:outline-offset-[4px] ${marketingInter.variable}`}>

      <a className="absolute top-2 left-2 z-[10] py-3 px-4.5 bg-white text-[#0e1630] rounded-lg [transform:translateY(-160%)] focus:[transform:translateY(0)]" href="#main-content">Skip to content</a>
      <MarketingHeader activePage="product" />

      <main id="main-content">
      <section className="max-w-300 mx-auto my-0 p-[80px_24px_72px] flex flex-wrap gap-14 items-center max-[1100px]:gap-10 max-[640px]:py-12 max-[640px]:px-5 max-[640px]:gap-9">
        <div className="flex-[1_1_460px] min-w-0 flex flex-col gap-7">
          <span className="self-start py-1.5 px-3 rounded-lg bg-[#e6ecfd] text-[#1d3fb0] text-[12px] font-semibold tracking-[0.12em]">WIKIPEDIA EVENT ANALYTICS</span>
          <h1 className="m-0 [font-family:var(--font-inter-tight),_sans-serif] font-extrabold text-[76px] leading-[0.98] tracking-[-0.035em] max-[1100px]:text-[64px] max-[640px]:text-[clamp(42px,11vw,64px)]">Wikipedia<br /><span className="text-[#2b59e8]">never stands still.</span></h1>
          <p className="m-0 max-w-130 text-[20px] leading-[1.5] text-[#4a5468] max-[640px]:text-[18px]">Explore a sampled stream of Wikipedia changes. See activity, spot patterns, and look behind the numbers.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="inline-flex items-center gap-2.5 h-14 py-0 px-6.5 rounded-xl bg-[#2b59e8] text-white text-[17px] font-semibold no-underline">Explore dashboard
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></Link>
            <Link href="/flow" className="inline-flex items-center h-14 py-0 px-6.5 rounded-xl border border-[#cdd5e2] bg-white text-[#0e1630] text-[17px] font-semibold no-underline">How it works</Link>
          </div>
          <ul className="m-0 p-0 list-none flex flex-wrap gap-[8px_20px] text-[14px] text-[#5a6478]">
            <li className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A8F84" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>Sampled events</li>
            <li className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A8F84" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>Stored in batches</li>
            <li className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A8F84" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>21-day history</li>
          </ul>
        </div>

        <figure className="flex-[1_1_480px] min-w-0 m-0 bg-white border border-[#e3e8f0] rounded-[18px] shadow-[0_24px_48px_-24px_rgba(14,22,48,0.18)] p-6 flex flex-col gap-5 max-[640px]:p-4.5">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <span className="font-semibold text-[16px]">Activity overview</span>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-[#157a71]"><span className="w-2 h-2 rounded-full bg-[#1aa79a]"></span>Collector healthy</span>
          </div>
          <div>
            <div className="[font-family:var(--font-inter-tight),_sans-serif] font-bold text-[40px] tracking-[-0.02em]">5,215</div>
            <div className="text-[14px] text-[#5a6478]">Sampled events · last 4 days</div>
          </div>
          <svg role="img" aria-label="Sampled events rising from about 40 to 300 per bucket between Apr 28 and May 1" viewBox="0 0 600 160" preserveAspectRatio="none" className="w-full h-37.5 block">
            <defs><linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2B59E8" stopOpacity="0.22"></stop><stop offset="1" stopColor="#2B59E8" stopOpacity="0"></stop></linearGradient></defs>
            <path d="M0 40H600M0 80H600M0 120H600" stroke="#EEF1F6" strokeWidth="1" vectorEffect="non-scaling-stroke"></path>
            <path d="M0 140L30 136L60 138L90 132L120 135L150 128L180 131L210 125L240 128L270 120L300 112L330 104L360 96L390 88L420 74L450 68L480 56L510 50L540 40L570 34L600 26L600 160L0 160Z" fill="url(#lg1)"></path>
            <path d="M0 140L30 136L60 138L90 132L120 135L150 128L180 131L210 125L240 128L270 120L300 112L330 104L360 96L390 88L420 74L450 68L480 56L510 50L540 40L570 34L600 26" fill="none" stroke="#2B59E8" strokeWidth="2.2" vectorEffect="non-scaling-stroke"></path>
          </svg>
          <div className="grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-3 border-t border-t-[#eef1f6] pt-4">
            <div><div className="font-bold text-[22px]">90</div><div className="text-[13px] text-[#5a6478]">Active wikis</div></div>
            <div><div className="font-bold text-[22px]">3,767</div><div className="text-[13px] text-[#5a6478]">Unique pages</div></div>
            <div><div className="font-bold text-[22px]">4</div><div className="text-[13px] text-[#5a6478]">Event types</div></div>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="grid grid-cols-[150px_96px_1fr] gap-3 py-2 px-2.5 bg-[#f5f7fb] rounded-lg text-[12px] text-[#5a6478] font-medium max-[640px]:grid-cols-[70px_68px_minmax(0,_1fr)] max-[640px]:gap-2 max-[640px]:px-0"><span>Timestamp</span><span>Type</span><span>Page</span></div>
            <div className="grid grid-cols-[150px_96px_1fr] gap-3 p-2.5 text-[13px] items-center border-b border-b-[#eef1f6] max-[640px]:grid-cols-[70px_68px_minmax(0,_1fr)] max-[640px]:gap-2 max-[640px]:px-0 max-[640px]:[&_>_:first-child]:text-[11px] max-[640px]:[&_>_:last-child]:wrap-anywhere"><span className="[font-family:var(--font-jetbrains),_ui-monospace,_monospace]">05-01 14:23:11</span><span><span className="bg-[#ddf4f1] text-[#0f6b63] inline-flex items-center h-5.5 py-0 px-2 rounded-md text-[12px] font-medium">edit</span></span><span className="text-[#2b59e8]">Climate change</span></div>
            <div className="grid grid-cols-[150px_96px_1fr] gap-3 p-2.5 text-[13px] items-center border-b border-b-[#eef1f6] max-[640px]:grid-cols-[70px_68px_minmax(0,_1fr)] max-[640px]:gap-2 max-[640px]:px-0 max-[640px]:[&_>_:first-child]:text-[11px] max-[640px]:[&_>_:last-child]:wrap-anywhere"><span className="[font-family:var(--font-jetbrains),_ui-monospace,_monospace]">05-01 14:19:02</span><span><span className="bg-[#efe7fe] text-[#6230c9] inline-flex items-center h-5.5 py-0 px-2 rounded-md text-[12px] font-medium">new page</span></span><span className="text-[#2b59e8]">List of rivers in Colombia</span></div>
            <div className="grid grid-cols-[150px_96px_1fr] gap-3 p-2.5 text-[13px] items-center max-[640px]:grid-cols-[70px_68px_minmax(0,_1fr)] max-[640px]:gap-2 max-[640px]:px-0 max-[640px]:[&_>_:first-child]:text-[11px] max-[640px]:[&_>_:last-child]:wrap-anywhere"><span className="[font-family:var(--font-jetbrains),_ui-monospace,_monospace]">05-01 14:17:36</span><span><span className="bg-[#ddf4f1] text-[#0f6b63] inline-flex items-center h-5.5 py-0 px-2 rounded-md text-[12px] font-medium">edit</span></span><span className="text-[#2b59e8]">Artificial intelligence</span></div>
          </div>
          <figcaption className="text-[12px] text-[#5a6478] text-right">Illustrative preview — sample data</figcaption>
        </figure>
      </section>

      <section className="bg-white border-t border-t-[#e3e8f0] border-b border-b-[#e3e8f0]">
        <div className="max-w-300 mx-auto my-0 py-22 px-6 flex flex-col gap-10 max-[640px]:py-14 max-[640px]:px-5 max-[640px]:gap-7">
          <div className="flex flex-col gap-3 max-w-180">
            <span className="text-[12px] font-semibold tracking-[0.14em] text-[#2b59e8]">FROM ACTIVITY TO CONTEXT</span>
            <h2 className="m-0 [font-family:var(--font-inter-tight),_sans-serif] font-bold text-[48px] leading-[1.05] tracking-[-0.025em] max-[640px]:text-[36px]">A clearer picture of every change.</h2>
            <p className="m-0 text-[18px] text-[#4a5468] leading-[1.5]">Turn a stream of events into insight with flexible views and real context.</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,_minmax(300px,_1fr))] gap-5 max-[640px]:grid-cols-[minmax(0,_1fr)]">
            <article className="border border-[#e3e8f0] rounded-2xl p-7 flex flex-col gap-4 bg-[#fbfcfe] max-[640px]:p-6">
              <div className="w-11 h-11 rounded-xl bg-[#e6ecfd] flex items-center justify-center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2B59E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 20h18M5 16l4-5 4 3 6-8"></path></svg></div>
              <h3 className="m-0 text-[20px] font-semibold">See the pace of change</h3>
              <p className="m-0 text-[15px] leading-[1.55] text-[#4a5468]">Track sampled activity over time and compare changes across time windows — from 15 minutes to 21 days.</p>
              <svg role="img" aria-label="Small trend line rising over a week" viewBox="0 0 300 90" preserveAspectRatio="none" className="w-full h-22.5 mt-auto"><path d="M0 75L30 70L60 72L90 64L120 66L150 55L180 50L210 42L240 34L270 28L300 18" fill="none" stroke="#2B59E8" strokeWidth="2" vectorEffect="non-scaling-stroke"></path></svg>
            </article>
            <article className="border border-[#e3e8f0] rounded-2xl p-7 flex flex-col gap-4 bg-[#fbfcfe] max-[640px]:p-6">
              <div className="w-11 h-11 rounded-xl bg-[#e6ecfd] flex items-center justify-center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2B59E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4-2v-4z"></path></svg></div>
              <h3 className="m-0 text-[20px] font-semibold">Find the details that matter</h3>
              <p className="m-0 text-[15px] leading-[1.55] text-[#4a5468]">Filter by event type, page or wiki language to focus your analysis on what you care about.</p>
              <div className="mt-auto flex flex-wrap gap-2">
                <span className="h-5.5 py-0 px-2 border border-[#cdd5e2] bg-white text-[#0e1630] inline-flex items-center rounded-md text-[12px] font-medium">Type: Edit</span>
                <span className="h-5.5 py-0 px-2 border border-[#cdd5e2] bg-white text-[#0e1630] inline-flex items-center rounded-md text-[12px] font-medium">Language: English</span>
                <span className="h-5.5 py-0 px-2 border border-[#cdd5e2] bg-white text-[#0e1630] inline-flex items-center rounded-md text-[12px] font-medium">Page: Climate…</span>
              </div>
            </article>
            <article className="border border-[#e3e8f0] rounded-2xl p-7 flex flex-col gap-4 bg-[#fbfcfe] max-[640px]:p-6">
              <div className="w-11 h-11 rounded-xl bg-[#e6ecfd] flex items-center justify-center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2B59E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6zM9 12h7M9 16h7M9 8h3"></path></svg></div>
              <h3 className="m-0 text-[20px] font-semibold">Look behind the numbers</h3>
              <p className="m-0 text-[15px] leading-[1.55] text-[#4a5468]">Open any spike and inspect the individual events that make it up, right next to the chart.</p>
              <div className="mt-auto flex flex-col gap-1.5 text-[13px]">
                <div className="flex gap-2.5 items-center"><span className="text-[#5a6478] [font-family:var(--font-jetbrains),_ui-monospace,_monospace]">14:23:11</span><span className="bg-[#ddf4f1] text-[#0f6b63] inline-flex items-center h-5.5 py-0 px-2 rounded-md text-[12px] font-medium">edit</span><span className="text-[#2b59e8]">Climate change</span></div>
                <div className="flex gap-2.5 items-center"><span className="text-[#5a6478] [font-family:var(--font-jetbrains),_ui-monospace,_monospace]">14:19:02</span><span className="bg-[#efe7fe] text-[#6230c9] inline-flex items-center h-5.5 py-0 px-2 rounded-md text-[12px] font-medium">new page</span><span className="text-[#2b59e8]">List of rivers…</span></div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="max-w-300 mx-auto my-0 p-[88px_24px_0] max-[640px]:p-[48px_20px_0]">
        <div className="bg-[#0e1630] text-white rounded-3xl py-14 px-12 flex flex-wrap gap-12 items-center max-[640px]:py-8 max-[640px]:px-6 max-[640px]:gap-7">
          <div className="flex-[1_1_360px] min-w-0 flex flex-col gap-4">
            <h2 className="m-0 [font-family:var(--font-inter-tight),_sans-serif] font-bold text-[40px] leading-[1.08] tracking-[-0.02em] max-[640px]:text-[32px]">From a stream to a useful signal.</h2>
            <p className="m-0 text-[17px] leading-[1.55] text-[#c3cbdb]">Public Wikimedia events become a bounded sample, a stored history and an explorable dashboard.</p>
            <Link href="/flow" className="self-start py-3 px-0 text-[#8fb0ff] font-semibold text-[16px]">See how it works →</Link>
          </div>
          <ol className="flex-[2_1_520px] min-w-0 m-0 p-0 list-none grid grid-cols-[repeat(auto-fit,_minmax(160px,_1fr))] gap-4 max-[640px]:grid-cols-[minmax(0,_1fr)]">
            <li className="border border-[#2a3654] rounded-2xl p-5.5 flex flex-col gap-2"><span className="text-[#8fb0ff] text-[14px] [font-family:var(--font-jetbrains),_ui-monospace,_monospace]">01</span><strong className="text-[18px]">Collect</strong><span className="text-[14px] text-[#c3cbdb] leading-[1.5]">Read the public Wikimedia event stream.</span></li>
            <li className="border border-[#2a3654] rounded-2xl p-5.5 flex flex-col gap-2"><span className="text-[#8fb0ff] text-[14px] [font-family:var(--font-jetbrains),_ui-monospace,_monospace]">02</span><strong className="text-[18px]">Sample &amp; store</strong><span className="text-[14px] text-[#c3cbdb] leading-[1.5]">Keep a bounded sample, written in batches.</span></li>
            <li className="border border-[#2a3654] rounded-2xl p-5.5 flex flex-col gap-2"><span className="text-[#8fb0ff] text-[14px] [font-family:var(--font-jetbrains),_ui-monospace,_monospace]">03</span><strong className="text-[18px]">Explore</strong><span className="text-[14px] text-[#c3cbdb] leading-[1.5]">Charts, filters and recent events.</span></li>
          </ol>
        </div>
      </section>

      <section className="max-w-300 mx-auto my-0 py-22 px-6 flex flex-wrap gap-6 items-center justify-between max-[640px]:py-14 max-[640px]:px-5">
        <div className="flex flex-col gap-2">
          <h2 className="m-0 [font-family:var(--font-inter-tight),_sans-serif] font-bold text-[40px] tracking-[-0.02em] max-[640px]:text-[32px]">Explore the changes behind the pages.</h2>
          <p className="m-0 text-[17px] text-[#4a5468]">Dive into the data and see what is happening across Wikipedia right now.</p>
        </div>
        <Link href="/dashboard" className="inline-flex items-center gap-2.5 h-14 py-0 px-6.5 rounded-xl bg-[#2b59e8] text-white text-[17px] font-semibold no-underline">Open dashboard →</Link>
      </section>

      </main>
      <footer className="border-t border-t-[#e3e8f0] bg-white">
        <div className="max-w-300 mx-auto my-0 p-6 flex flex-wrap gap-4 items-center justify-between text-[14px] text-[#5a6478] max-[640px]:py-6 max-[640px]:px-5">
          <span className="font-bold text-[#0e1630]">WikiPulse</span>
          <span>Built on public Wikimedia event data. Not affiliated with the Wikimedia Foundation.</span>
          <nav aria-label="Footer" className="flex gap-1"><Link href="/" className="py-3 px-2 text-[#4a5468]">Product</Link><Link href="/flow" className="py-3 px-2 text-[#4a5468]">How it works</Link><Link href="/dashboard" className="py-3 px-2 text-[#4a5468]">Dashboard</Link></nav>
        </div>
      </footer>
    </div>
  );
}
