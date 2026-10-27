"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconActivity, IconBell, IconBook2, IconLayoutDashboard, IconListDetails } from "@tabler/icons-react";
import clsx from "clsx";

export function WorkspaceBreadcrumb() {
  const pathname = usePathname();
  return <nav aria-label="Breadcrumb" className="text-sm text-[#5a6478]">Workspace / <span className="font-medium text-[#0e1630]">{pathname === "/alerts" ? "Alerts" : "Overview"}</span></nav>;
}

export default function WorkspaceNavigation() {
  const pathname = usePathname();
  const items = [
    { label: "Overview", href: "/dashboard", icon: IconLayoutDashboard, active: pathname === "/dashboard" },
    { label: "Recent events", href: "/dashboard#recent-events", icon: IconListDetails, active: false },
    { label: "Alerts", href: "/alerts", icon: IconBell, active: pathname === "/alerts" },
  ];
  return (
    <aside className="flex shrink-0 flex-col gap-4 bg-[#0e1630] px-3.5 py-4 md:gap-7 md:py-6 text-[#c3cbdb] md:sticky md:top-0 md:h-dvh md:w-58 md:self-start">
      <div className="flex items-center justify-between gap-3">
      <Link href="/" className="flex items-center gap-2.5 px-2.5 py-1 text-white">
        <IconActivity size={26} stroke={2.4} className="text-[#7fa2ff]" aria-hidden />
        <span className="[font-family:var(--font-inter-tight)] text-xl font-bold">WikiPulse</span>
      </Link>
      </div>
      <nav aria-label="Workspace" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        <span className="hidden px-3.5 pb-2 text-[11px] font-semibold tracking-[0.14em] text-[#8e99b0] md:block">WORKSPACE</span>
        {items.map(({ label, href, icon: Icon, active }) => (
          <Link key={label} href={href} onClick={event => {
            if (href.endsWith("#recent-events") && pathname === "/dashboard") {
              const section = document.getElementById("recent-events");
              if (section) {
                event.preventDefault();
                window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#recent-events`);
                section.scrollIntoView({ block: "start" });
              }
            }
          }} aria-current={active ? "page" : undefined} className={clsx("flex min-h-11 shrink-0 items-center gap-2 rounded-[10px] px-2.5 text-sm transition-colors md:gap-3 md:px-3.5 md:text-[15px] focus-visible:outline-2 focus-visible:outline-[#7fa2ff]", active ? "bg-[#24345e] font-semibold text-white" : "hover:bg-[#24345e]/60 hover:text-white")}>
            <Icon size={18} aria-hidden />{label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-4 border-t border-[#24345e] pt-4 md:pt-5">
        <p className="hidden px-2.5 text-xs leading-relaxed text-[#8e99b0] md:block">Sampled Wikimedia events from the public EventStreams feed.</p>
        <Link href="/flow" className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#3a4d7a] bg-[#24345e] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:border-[#6986c4] hover:bg-[#304574] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fa2ff]">
          <IconBook2 size={18} aria-hidden />How it works
        </Link>
      </div>
    </aside>
  );
}
