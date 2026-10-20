import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import LibraryClient from "./LibraryClient";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.library.title, robots: { index: false } };
}

export default function LibraryPage() {
  return <LibraryClient />;
}
