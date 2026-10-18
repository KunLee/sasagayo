import type { Metadata } from "next";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; confirmed?: string }> }) {
  const { next, confirmed } = await searchParams;
  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Sign in"
      intro="Your saved recordings follow you to every device."
      footer={<>New to Sasagayo? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-accent">Create a free account</Link></>}
    >
      <AuthForm mode="signin" next={next} notice={confirmed ? "Your email is confirmed. Sign in to continue." : undefined} />
    </AuthCard>
  );
}
