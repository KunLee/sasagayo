import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuthCard eyebrow="Account" title="Choose a new password">
      <ResetPasswordForm />
    </AuthCard>
  );
}
