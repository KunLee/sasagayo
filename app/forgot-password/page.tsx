import type { Metadata } from "next";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      eyebrow="Account"
      title="Forgot your password?"
      intro="Enter your email and we'll send a link to choose a new one."
      footer={<Link href="/signin" className="font-semibold text-accent">Back to sign in</Link>}
    >
      <AuthForm mode="forgot" />
    </AuthCard>
  );
}
