import type { Metadata } from "next";
import LibraryClient from "./LibraryClient";

export const metadata: Metadata = { title: "My library", robots: { index: false } };

export default function LibraryPage() {
  return <LibraryClient />;
}
