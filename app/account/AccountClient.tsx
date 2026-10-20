"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import AuthCard, { Field, FormMessage, SubmitButton } from "@/components/auth/AuthCard";
import { useI18n } from "@/components/I18nProvider";
import { useSession } from "@/components/SessionProvider";
import { useLibrary } from "@/lib/library-store";

export default function AccountClient({ passwordUpdated }: { passwordUpdated: boolean }) {
  const router = useRouter();
  const session = useSession();
  const library = useLibrary();
  const { t } = useI18n();
  const [message, setMessage] = useState(passwordUpdated ? t.account.passwordSaved : "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const account = session.account;

  useEffect(() => {
    if (!session.loading && !account) router.replace("/signin?next=/account");
  }, [session.loading, account, router]);

  if (!account) return <div className="min-h-[60vh]" />;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = String(new FormData(event.currentTarget).get("displayName") ?? "");
    setPending(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName }) });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) { setError(data.error ?? t.auth.errors.generic); return; }
    session.setAccount({ ...account!, displayName: data.account.displayName });
    setMessage(t.account.saved);
  }

  return (
    <AuthCard
      eyebrow={account.role === "admin" ? t.account.editorEyebrow : t.account.eyebrow}
      title={t.account.hello(account.displayName)}
      intro={<>{t.account.signedInAs} <span className="font-medium text-ink-2">{account.email}</span></>}
      footer={<button type="button" onClick={async () => { await session.signOut(); router.push("/"); }} className="font-semibold text-accent">{t.account.signOut}</button>}
    >
      <div className="grid gap-6">
        {account.status === "suspended" && (
          <FormMessage>{t.account.suspended}</FormMessage>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/library" className="rounded-2xl border border-line p-4 transition hover:border-accent">
            <span className="block font-serif text-3xl tabular-nums">{library.tracks.length}</span>
            <span className="text-xs text-muted">{t.account.savedRecordings}{library.sync === "error" ? t.account.syncProblem : ""}</span>
          </Link>
          {account.role === "admin" ? (
            <Link href="/admin" className="rounded-2xl border border-line p-4 transition hover:border-accent">
              <span className="block font-serif text-3xl">{t.account.desk}</span>
              <span className="text-xs text-muted">{t.account.editorTools}</span>
            </Link>
          ) : (
            <div className="rounded-2xl border border-line p-4">
              <span className="block font-serif text-3xl">{t.account.listener}</span>
              <span className="text-xs text-muted">{t.account.freeAccount}</span>
            </div>
          )}
        </div>
        <form onSubmit={save} className="grid gap-3">
          <Field label={t.account.displayName} name="displayName" defaultValue={account.displayName} required maxLength={60} />
          {message && <FormMessage tone="info">{message}</FormMessage>}
          {error && <FormMessage>{error}</FormMessage>}
          <SubmitButton pending={pending} pendingLabel={t.auth.oneMoment}>{t.account.save}</SubmitButton>
        </form>
        <p className="text-xs text-muted">
          {t.account.changePasswordA} <Link href="/forgot-password" className="text-accent hover:underline">{t.account.changePasswordLink}</Link>{t.locale === "zh" ? "。" : "."}
        </p>
      </div>
    </AuthCard>
  );
}
