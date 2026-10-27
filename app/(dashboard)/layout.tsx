import { marketingInter } from "@/app/fonts";
import { Header } from "./components/Header";
import WorkspaceNavigation from "./components/WorkspaceNavigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${marketingInter.variable} flex h-dvh flex-col overflow-y-auto bg-[#f5f7fb] text-[#0e1630] [font-family:var(--font-landing-inter),sans-serif] [--color-paper:#f5f7fb] [--color-paper-deep:#e6ecfd] [--color-ink:#0e1630] [--color-ink-soft:#4a5468] [--color-ink-faint:#e3e8f0] [--color-ink-2:#4a5468] [--color-ink-3:#5a6478] [--color-hair:#e3e8f0] [--color-rule:#cdd5e2] [--color-brand:#2b59e8] [--color-signal:#2b59e8] [--color-shell:#fff] [--color-card:#fff] [--color-dash-event-1:#2b59e8] [--color-dash-event-2:#1aa79a] [--color-dash-event-3:#8b5cf6] [--font-data:var(--font-landing-inter)] [--font-display:var(--font-inter-tight)] [--font-body:var(--font-landing-inter)] md:flex-row`}>
      <WorkspaceNavigation />
      <div className="flex min-w-0 flex-1 flex-col gap-5 px-4 pt-6 pb-12 sm:px-6 lg:px-8">
        <Header />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
