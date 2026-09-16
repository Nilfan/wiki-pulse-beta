import {
  HeartbeatCell,
  HeartbeatFrame,
  HeartbeatTrace,
} from "./HeartbeatBadge";

export default function HeartbeatSkeleton() {
  return (
    <HeartbeatFrame label="Checking ingestion">
      <HeartbeatCell className="gap-2.5 text-paper-deep animate-pulse">
        <HeartbeatTrace path="M0 10 H144" />
        <span className="block h-2.5 w-13 bg-paper-deep" />
      </HeartbeatCell>
      <HeartbeatCell className="max-sm:hidden animate-pulse">
        <span className="block h-2.5 w-14 bg-paper-deep" />
      </HeartbeatCell>
    </HeartbeatFrame>
  );
}
