import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import { getI18n } from "@/lib/i18n/server";
import ResetPasswordForm from "./ResetPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.reset.title, robots: { index: false } };
}

export default async function ResetPasswordPage() {
  const { t } = await getI18n();
  return (
    <AuthCard eyebrow={t.auth.reset.eyebrow} title={t.auth.reset.title}>
      <ResetPasswordForm />
    </AuthCard>
  );
}
