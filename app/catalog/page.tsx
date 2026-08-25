import type { Metadata } from "next";
import CatalogClient from "./CatalogClient";

export const metadata: Metadata = {
  title: "Open classical music catalog",
  description:
    "Public-domain and openly licensed classical recordings with clear provenance and attribution.",
};
export default function CatalogPage() {
  return <CatalogClient />;
}
