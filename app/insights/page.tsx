import type { Metadata } from "next";
import InsightsClient from "./InsightsClient";

export const metadata: Metadata = {
  title: "Community pulse · Sasagayo",
  description: "A privacy-conscious view of the Sasagayo community.",
};

export default function InsightsPage() {
  return <InsightsClient />;
}
