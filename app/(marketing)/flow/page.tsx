import type { Metadata } from "next";
import Link from "next/link";
import { marketingInter } from "@/app/fonts";
import {
  MAX_EVENTS_PER_ONE_MINUTE,
  BATCH_ADD_THROTTLE_MS,
  MAX_BATCH_CAPACITY,
  FLUSH_TIMEOUT_MS,
  CLEARANCE_DB_PERIOD_DAYS,
  CLEARANCE_PERIOD_HOURS,
} from "@/lib/collector-config";
import { MarketingHeader } from "../components/MarketingHeader";

export const metadata: Metadata = {
  title: "How it works — WikiPulse",
  description: "From Wikimedia’s public event stream to a bounded sample, stored history and an explorable Wikipedia dashboard. Learn how to read the numbers.",
};

const keptDots = new Set([3, 17, 24, 38, 46, 59, 63, 77, 81, 95]);
const eventTypes = [
  { name: "Edit", color: "bg-[#1aa79a]", description: "A new revision of an existing page — from a typo fix to a full rewrite." },
  { name: "New page", color: "bg-[#8b5cf6]", description: "A newly created page, including user and talk pages." },
  { name: "Categorize", color: "bg-[#2b59e8]", description: "A page added to or removed from a category. One edit can trigger several category changes." },
  { name: "Log", color: "bg-[#a8b1c1]", description: "Logged actions such as uploads, moves, protections and account creation." },
];

function PipelineArrow() {
  return <div className="flex items-center justify-center text-[#8e99b0] max-[1000px]:h-12 max-[1000px]:[&_svg]:[transform:rotate(90deg)]" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></div>;
}

export default function FlowPage() {
  const batchMinutes = FLUSH_TIMEOUT_MS / 60_000;
  const slotSeconds = BATCH_ADD_THROTTLE_MS / 1000;

  return (
    <div className={`[font-family:var(--font-landing-inter),_system-ui,_sans-serif] text-[#0e1630] bg-[#f5f7fb] min-h-screen h-dvh overflow-y-auto [&_a]:[transition:background-color_150ms,_color_150ms,_box-shadow_150ms] [&_a:hover]:[filter:brightness(0.9)] [&_a:focus-visible]:[outline:3px_solid_#2b59e8] [&_a:focus-visible]:outline-offset-[4px] scroll-smooth motion-reduce:scroll-auto [&_section[id]]:scroll-mt-6 ${marketingInter.variable}`}>
      <a className="absolute top-2 left-2 z-[10] py-3 px-4.5 bg-white text-[#0e1630] rounded-lg [transform:translateY(-160%)] focus:[transform:translateY(0)]" href="#main-content">Skip to content</a>
      <MarketingHeader activePage="flow" />
      <main id="main-content">
        <section className="max-w-300 mx-auto my-0 px-6 pt-18 pb-14 flex flex-wrap gap-12 max-[640px]:px-5 max-[640px]:pt-12 max-[640px]:pb-9 max-[640px]:gap-7" aria-labelledby="flow-title">
          <div className="flex-[1_1_520px] min-w-0 flex flex-col gap-5">
            <span className="text-[12px] font-semibold tracking-[.14em] text-[#2b59e8]">HOW IT WORKS</span>
            <h1 id="flow-title" className="m-0 [font-family:var(--font-inter-tight),sans-serif] text-[60px] font-extrabold leading-[1.02] tracking-[-0.03em] max-[640px]:text-[clamp(38px,10vw,52px)]">From a firehose<br />to a readable signal.</h1>
            <p className="m-0 text-[19px] leading-[1.6] text-[#4a5468] max-w-145 max-[640px]:text-[18px]">Wikipedia never stands still. WikiPulse listens to the public Wikimedia stream, keeps a bounded sample, and turns it into charts you can explore — as long as you read them as a sample.</p>
          </div>
          <nav aria-label="On this page" className="flex-[1_1_260px] self-end flex flex-col gap-0.5 border-l-[2px] border-l-[#e3e8f0] pl-4.5 [&_span]:text-[13px] [&_span]:font-semibold [&_span]:text-[#5a6478] [&_span]:pb-1.5 [&_a]:py-2.5 [&_a]:px-0 [&_a]:text-[15px] [&_a]:no-underline max-[640px]:self-stretch">
            <span>On this page</span>
            <a className="text-[#2b59e8]" href="#pipeline">The pipeline</a>
            <a className="text-[#2b59e8]" href="#sampling">What “sampled” means</a>
            <a className="text-[#2b59e8]" href="#types">Event types</a>
            <a className="text-[#2b59e8]" href="#faq">Questions</a>
          </nav>
        </section>

        <section id="pipeline" className="max-w-300 mx-auto my-0 px-6 pb-20 grid grid-cols-[minmax(0,_1fr)_48px_minmax(0,_1fr)_48px_minmax(0,_1fr)] items-stretch max-[1000px]:grid-cols-[minmax(0,_1fr)] max-[640px]:px-5 max-[640px]:pb-12" aria-label="The pipeline">
          <article className="min-w-0 bg-white border border-[#e3e8f0] rounded-[18px] p-7 flex flex-col gap-3.5 [&_h2]:m-0 [&_h2]:text-[22px] [&_h2]:font-semibold [&_h2]:leading-[1.2] [&_p]:text-[15px] max-[640px]:p-6">
            <div className="flex items-center gap-3"><span className="[font-family:var(--font-jetbrains),_ui-monospace,_monospace] inline-flex flex-[0_0_40px] h-10 rounded-full bg-[#0e1630] text-white items-center justify-center text-[15px]">01</span><h2>Collect</h2></div>
            <p className="m-0 text-[17px] leading-[1.6] text-[#4a5468]">A collector subscribes to Wikimedia EventStreams: a public feed of edits, new pages, category changes and log actions across Wikimedia projects.</p>
            <a className="[font-family:var(--font-jetbrains),_ui-monospace,_monospace] mt-auto py-3 px-3.5 rounded-[10px] bg-[#f5f7fb] text-[13px] text-[#4a5468] wrap-anywhere" href="https://stream.wikimedia.org/v2/stream/recentchange">stream: recentchange · all wikis ↗</a>
          </article>
          <PipelineArrow />
          <article className="min-w-0 bg-white border border-[#e3e8f0] rounded-[18px] p-7 flex flex-col gap-3.5 [&_h2]:m-0 [&_h2]:text-[22px] [&_h2]:font-semibold [&_h2]:leading-[1.2] [&_p]:text-[15px] max-[640px]:p-6">
            <div className="flex items-center gap-3"><span className="[font-family:var(--font-jetbrains),_ui-monospace,_monospace] inline-flex flex-[0_0_40px] h-10 rounded-full bg-[#0e1630] text-white items-center justify-center text-[15px]">02</span><h2>Sample &amp; store</h2></div>
            <p className="m-0 text-[17px] leading-[1.6] text-[#4a5468]">The first valid event in each {slotSeconds}-second slot is kept, up to {MAX_EVENTS_PER_ONE_MINUTE} per minute. Events are saved in batches; a cleanup runs every {CLEARANCE_PERIOD_HOURS} hours to remove data older than {CLEARANCE_DB_PERIOD_DAYS} days.</p>
            <div className="[font-family:var(--font-jetbrains),_ui-monospace,_monospace] mt-auto py-3 px-3.5 rounded-[10px] bg-[#f5f7fb] text-[13px] text-[#4a5468] wrap-anywhere">{MAX_EVENTS_PER_ONE_MINUTE}/min · batch every {batchMinutes} min · {CLEARANCE_DB_PERIOD_DAYS} d</div>
          </article>
          <PipelineArrow />
          <article className="min-w-0 bg-[#0e1630] border border-[#e3e8f0] rounded-[18px] p-7 flex flex-col gap-3.5 [&_h2]:m-0 [&_h2]:text-[22px] [&_h2]:font-semibold [&_h2]:leading-[1.2] [&_p]:text-[15px] text-white border-[#0e1630] [&_span]:bg-[#2b59e8] [&_p]:text-[#c3cbdb] max-[640px]:p-6">
            <div className="flex items-center gap-3"><span className="[font-family:var(--font-jetbrains),_ui-monospace,_monospace] inline-flex flex-[0_0_40px] h-10 rounded-full bg-[#0e1630] text-white items-center justify-center text-[15px]">03</span><h2>Explore</h2></div>
            <p className="m-0 text-[17px] leading-[1.6] text-[#4a5468]">The dashboard aggregates stored batches into time buckets, breakdowns and top lists. The sample can include Wikimedia projects beyond Wikipedia. Filter by time, event type, page or wiki language, then inspect individual events.</p>
            <Link className="mt-auto self-start py-2.5 text-[#8fb0ff] font-semibold text-[15px]" href="/dashboard">Open dashboard →</Link>
          </article>
        </section>

        <section id="sampling" className="bg-white border-t border-t-[#e3e8f0] border-b border-b-[#e3e8f0]" aria-labelledby="sampling-title">
          <div className="max-w-300 mx-auto my-0 px-6 py-20 flex flex-wrap gap-14 max-[640px]:px-5 max-[640px]:py-14 max-[640px]:gap-8">
            <div className="flex-[1_1_420px] min-w-0 flex flex-col gap-4.5">
              <span className="text-[12px] font-semibold tracking-[.14em] text-[#2b59e8]">READ THE NUMBERS RIGHT</span>
              <h2 id="sampling-title" className="m-0 [font-family:var(--font-inter-tight),_sans-serif] font-bold text-[40px] leading-[1.08] tracking-[-.02em] max-[640px]:text-[34px]">What “sampled” means.</h2>
              <p className="m-0 text-[17px] leading-[1.6] text-[#4a5468]">Each number on the dashboard counts events in the sample, not all of Wikipedia. Compare patterns within the collected data; this time-based sample does not guarantee representative shares or rankings.</p>
              <div className="grid grid-cols-[repeat(20,_minmax(0,_1fr))] gap-1 max-w-105 pt-2" aria-hidden="true">
                {Array.from({ length: 100 }, (_, index) => <span key={index} className={keptDots.has(index) ? "block [aspect-ratio:1] rounded-full bg-[#2b59e8]" : "block [aspect-ratio:1] rounded-full bg-[#dce2ec]"} />)}
              </div>
              <p className="m-0 text-[14px] text-[#5a6478]">Illustration only: highlighted dots are kept, the rest pass by. This is not the actual proportion collected.</p>
            </div>
            <div className="flex-[1_1_420px] min-w-0 grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-4 content-start max-[640px]:grid-cols-[minmax(0,_1fr)]">
              <div className="[border:1px_solid] rounded-2xl p-5.5 flex flex-col gap-3 border-[#a6dcd5] bg-[#f2fbf9] [&_strong]:flex [&_strong]:items-center [&_strong]:gap-2 [&_strong]:text-[#0f6b63] [&_strong_span]:text-[22px] [&_strong_span]:leading-[1] [&_ul]:m-0 [&_ul]:pl-4.5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:text-[15px] [&_ul]:leading-[1.5] [&_ul]:list-disc">
                <strong><span aria-hidden="true">✓</span> Good questions</strong>
                <ul>
                  <li>How does sampled activity change over time?</li>
                  <li>What share of the sample is edits?</li>
                  <li>Which pages appear often in the sample?</li>
                  <li>When does a sampled spike appear?</li>
                </ul>
              </div>
              <div className="[border:1px_solid] rounded-2xl p-5.5 flex flex-col gap-3 border-[#f3c9a8] bg-[#fff7f0] [&_strong]:flex [&_strong]:items-center [&_strong]:gap-2 [&_strong]:text-[#9a3d0e] [&_strong_span]:text-[22px] [&_strong_span]:leading-[1] [&_ul]:m-0 [&_ul]:pl-4.5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:text-[15px] [&_ul]:leading-[1.5] [&_ul]:list-disc">
                <strong><span aria-hidden="true">×</span> Not supported</strong>
                <ul>
                  <li>Exact total edits per day</li>
                  <li>Every edit to a single page</li>
                  <li>Rankings of individual editors</li>
                  <li>A guaranteed history beyond {CLEARANCE_DB_PERIOD_DAYS} days</li>
                </ul>
              </div>
              <dl className="m-0 col-span-full border border-[#e3e8f0] rounded-2xl p-5.5 grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-4 [&_dd]:m-0 [&_dd]:[font-family:var(--font-inter-tight),_sans-serif] [&_dd]:font-bold [&_dd]:text-[28px] [&_dt]:text-[14px] [&_dt]:text-[#5a6478] max-[640px]:p-4.5 max-[640px]:gap-3 max-[640px]:[&_dd]:text-[23px] max-[640px]:[&_dt]:text-[12px]">
                <div><dd>≤ {MAX_EVENTS_PER_ONE_MINUTE}/min</dd><dt>collection target</dt></div>
                <div><dd>{batchMinutes} min</dd><dt>batch interval</dt></div>
                <div><dd>{CLEARANCE_DB_PERIOD_DAYS} days</dd><dt>rolling history</dt></div>
              </dl>
            </div>
          </div>
        </section>

        <section id="types" className="max-w-300 mx-auto my-0 px-6 py-20 flex flex-col gap-8 max-[640px]:px-5 max-[640px]:py-14 max-[640px]:gap-8" aria-labelledby="types-title">
          <div className="flex flex-col gap-3 max-w-160"><span className="text-[12px] font-semibold tracking-[.14em] text-[#2b59e8]">GLOSSARY</span><h2 id="types-title" className="m-0 [font-family:var(--font-inter-tight),_sans-serif] font-bold text-[40px] leading-[1.08] tracking-[-.02em] max-[640px]:text-[34px]">Four kinds of change.</h2></div>
          <div className="grid grid-cols-[repeat(4,_minmax(0,_1fr))] gap-4 max-[1000px]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[640px]:grid-cols-[minmax(0,_1fr)]">
            {eventTypes.map(({ name, color, description }) => (
              <article className="bg-white border border-[#e3e8f0] rounded-2xl p-6 flex flex-col gap-2.5 [&_h3]:m-0 [&_h3]:text-[18px] [&_h3]:font-semibold [&_p]:text-[15px]" key={name}>
                <span className={`size-3 rounded-[3px] ${color}`} aria-hidden="true" />
                <h3>{name}</h3><p className="m-0 text-[17px] leading-[1.6] text-[#4a5468]">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="bg-white border-t border-t-[#e3e8f0] [&_details]:border-b [&_details]:border-b-[#e3e8f0] [&_details]:py-4.5 [&_details]:px-0 [&_summary]:text-[18px] [&_summary]:font-semibold [&_summary]:cursor-pointer [&_summary]:min-h-7 [&_summary]:[list-style:disclosure-closed] [&_details[open]_summary]:[list-style:disclosure-open] [&_summary:focus-visible]:[outline:3px_solid_#2b59e8] [&_summary:focus-visible]:outline-offset-[6px] [&_summary:focus-visible]:rounded-[4px] [&_p]:mt-3 [&_p]:text-[16px]" aria-labelledby="faq-title">
          <div className="max-w-215 mx-auto my-0 py-20 px-6 flex flex-col gap-6 max-[640px]:py-14 max-[640px]:px-5 max-[640px]:gap-5">
            <h2 id="faq-title" className="m-0 [font-family:var(--font-inter-tight),_sans-serif] font-bold text-[40px] leading-[1.08] tracking-[-.02em] max-[640px]:text-[34px]">Questions</h2>
            <details open>
              <summary>Why is the chart flat before a certain time?</summary>
              <p className="m-0 text-[17px] leading-[1.6] text-[#4a5468]">There may be no stored events for that period: the collector may not have been running, the filters may exclude the available events, or older data may have been removed. An empty period is not proof of zero Wikipedia activity.</p>
            </details>
            <details>
              <summary>Why don’t the newest changes appear immediately?</summary>
              <p className="m-0 text-[17px] leading-[1.6] text-[#4a5468]">Events become available after a batch is saved, normally every {batchMinutes} minutes, with up to {MAX_BATCH_CAPACITY} events per batch. Empty sampling slots stay empty. Failed writes are retained for retry, so interruptions can delay data further.</p>
            </details>
            <details>
              <summary>Are bot edits included?</summary>
              <p className="m-0 text-[17px] leading-[1.6] text-[#4a5468]">Yes. The collector does not exclude an event because it was made by a bot. The dashboard’s event type, page and language filters also do not distinguish bot edits.</p>
            </details>
            <details>
              <summary>Is WikiPulse affiliated with Wikimedia?</summary>
              <p className="m-0 text-[17px] leading-[1.6] text-[#4a5468]">No. It is an independent project built on public Wikimedia event data.</p>
            </details>
            <div className="flex flex-wrap gap-3 pt-4 [&_a]:h-13 [&_a]:py-0 [&_a]:px-6 [&_a]:text-[16px]">
              <Link href="/dashboard" className="inline-flex items-center gap-2.5 h-14 py-0 px-6.5 rounded-xl bg-[#2b59e8] text-white text-[17px] font-semibold no-underline">Open dashboard →</Link>
              <Link href="/" className="inline-flex items-center h-14 py-0 px-6.5 rounded-xl border border-[#cdd5e2] bg-white text-[#0e1630] text-[17px] font-semibold no-underline">Back to product</Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-t-[#e3e8f0]">
        <div className="max-w-300 mx-auto my-0 p-6 flex flex-wrap gap-4 items-center justify-between text-[14px] text-[#5a6478] max-[640px]:py-6 max-[640px]:px-5"><span className="font-bold text-[#0e1630]">WikiPulse</span><span>Built on public Wikimedia event data. Not affiliated with the Wikimedia Foundation.</span></div>
      </footer>
    </div>
  );
}
