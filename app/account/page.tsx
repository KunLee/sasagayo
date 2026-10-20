import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import AccountClient from "./AccountClient";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.title, robots: { index: false } };
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  const { updated } = await searchParams;
  return <AccountClient passwordUpdated={Boolean(updated)} />;
}
