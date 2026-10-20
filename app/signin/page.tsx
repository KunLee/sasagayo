import type { Metadata } from "next";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import AuthForm from "@/components/auth/AuthForm";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.signIn.title, robots: { index: false } };
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; confirmed?: string }> }) {
  const { next, confirmed } = await searchParams;
  const { t } = await getI18n();
  return (
    <AuthCard
      eyebrow={t.auth.signIn.eyebrow}
      title={t.auth.signIn.title}
      intro={t.auth.signIn.intro}
      footer={<>{t.auth.signIn.footer} <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-accent">{t.auth.signIn.footerLink}</Link></>}
    >
      <AuthForm mode="signin" next={next} notice={confirmed ? t.auth.signIn.confirmed : undefined} />
    </AuthCard>
  );
}
