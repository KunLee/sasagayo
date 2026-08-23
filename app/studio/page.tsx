import type { Metadata } from "next";
import StudioClient from "./StudioClient";

export const metadata: Metadata = {
  title: "Studio",
  description: "Upload and manage your Sasagayo music and artwork.",
};

export default function StudioPage() {
  return <StudioClient />;
}

