import type { Metadata } from "next";
import ReputationClient from "./ReputationClient";

export const metadata: Metadata = { title: "Reputation · Sasagayo" };
export default function ReputationPage() {
  return <ReputationClient />;
}
