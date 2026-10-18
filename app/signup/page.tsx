import type { Metadata } from "next";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthCard
      eyebrow="Free, always"
      title="Create an account"
      intro="Keep your library in sync across phone and computer. Listening never requires an account."
      footer={<>Already have one? <Link href={`/signin${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-accent">Sign in</Link></>}
    >
      <AuthForm mode="signup" next={next} />
    </AuthCard>
  );
}
