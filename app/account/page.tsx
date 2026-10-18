import type { Metadata } from "next";
import AccountClient from "./AccountClient";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  const { updated } = await searchParams;
  return <AccountClient passwordUpdated={Boolean(updated)} />;
}
