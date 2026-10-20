import type { Metadata } from "next";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import AuthForm from "@/components/auth/AuthForm";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.forgotPage.title, robots: { index: false } };
}

export default async function ForgotPasswordPage() {
  const { t } = await getI18n();
  return (
    <AuthCard
      eyebrow={t.auth.forgotPage.eyebrow}
      title={t.auth.forgotPage.title}
      intro={t.auth.forgotPage.intro}
      footer={<Link href="/signin" className="font-semibold text-accent">{t.auth.forgotPage.back}</Link>}
    >
      <AuthForm mode="forgot" />
    </AuthCard>
  );
}
