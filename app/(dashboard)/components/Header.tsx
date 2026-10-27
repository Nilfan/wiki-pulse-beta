import { Suspense } from "react";
import Heartbeat from "./heartbeat/Heartbeat";
import HeartbeatSkeleton from "./heartbeat/HeartbeatSkeleton";
import { WorkspaceBreadcrumb } from "./WorkspaceNavigation";

export function Header() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <WorkspaceBreadcrumb />
      <Suspense fallback={<HeartbeatSkeleton />}><Heartbeat /></Suspense>
    </header>
  );
}
