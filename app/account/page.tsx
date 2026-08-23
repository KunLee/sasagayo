import type { Metadata } from "next";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "Account",
  description: "Join Sasagayo or manage your listening session.",
};

export default function AccountPage() {
  return <AccountClient />;
}

