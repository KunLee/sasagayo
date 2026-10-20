import type { Metadata } from "next";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import AuthForm from "@/components/auth/AuthForm";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.signUp.title, robots: { index: false } };
}

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const { t } = await getI18n();
  return (
    <AuthCard
      eyebrow={t.auth.signUp.eyebrow}
      title={t.auth.signUp.title}
      intro={t.auth.signUp.intro}
      footer={<>{t.auth.signUp.footer} <Link href={`/signin${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-accent">{t.auth.signUp.footerLink}</Link></>}
    >
      <AuthForm mode="signup" next={next} />
    </AuthCard>
  );
}
