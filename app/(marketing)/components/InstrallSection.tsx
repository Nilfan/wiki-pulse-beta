
export const InstallSection = () => (
  <section className="mx-0 mt-0 mb-[clamp(48px,6vw,80px)]">
    <div className="max-w-maxw mx-auto my-0 py-0 px-gut">
      <div className="border border-ink bg-ink text-paper p-[clamp(22px,3vw,34px)]">
        <h2
          className="font-display font-medium text-[clamp(16px,2vw,21px)] tracking-[-0.06em] mx-0 mt-0 mb-1.5"
        >
          Install takes one line
        </h2>
        <p className="mx-0 mt-0 mb-5 text-[#A9AFB4] text-[14.5px] max-w-[75%] min-[901px]:max-w-full">
          Drop it in your head tag. Pageviews start immediately; call{" "}
          <code className="font-data text-[13px]">
            pulse()
          </code>{" "}
          yourself for anything else worth counting.
        </p>
        <div className="flex items-center gap-3.5 bg-[#20242A] border border-[#333940] px-3.75 py-3.25 overflow-x-auto">
          <code
            className="font-data text-[12.5px] text-[#D7DBDE] whitespace-nowrap"
          >
            &lt;script src=&quot;https://wikipulse.dev/tracker.js&quot;
            <b className="text-[#8FA6FF] font-normal">data-org</b>
            =&quot;acme-inc&quot;&gt;&lt;/script&gt;
          </code>
          <button
            className="font-data ml-auto flex-none bg-transparent border border-[#4A5158] text-[#A9AFB4] text-[11px] px-2.75 py-1.5"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  </section>
);
