import type { Metadata } from "next";
import { FeaturesSection } from "./components/FeaturesSection";
import { HeroSection } from "./components/HeroSection";
import { HowItWorksSection } from "./components/HowItWorksSection";

export const metadata: Metadata = {
  title: "Wiki Pulse — Wikipedia event analytics",
  description:
    "Wiki Pulse collects Wikipedia events from Wikimedia’s live SSE stream and builds brief analytics of recent activity, event types, pages and wiki languages.",
};

export default function MarketingPage() {
  return (
    <div>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
    </div>
  );
}
