"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/components/I18nProvider";
import { useSession } from "@/components/SessionProvider";
import type { Dictionary } from "@/lib/i18n";
import { Field, FormMessage, SubmitButton } from "./AuthCard";

type Mode = "signin" | "signup" | "forgot";

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

/** Only same-site paths may be used as a post-sign-in destination. */
export function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/library";
}

export default function AuthForm({ mode, next, notice }: { mode: Mode; next?: string; notice?: string }) {
  const router = useRouter();
  const session = useSession();
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [info, setInfo] = useState(notice ?? "");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    setPending(true);
    setError("");
    setInfo("");
    try {
      if (mode === "forgot") {
        await post({ action: "forgot", email: form.email });
        setDone(true);
        return;
      }
      const { ok, data } = await post(
        mode === "signin"
          ? { action: "login", email: form.email, password: form.password }
          : { action: "signup", email: form.email, password: form.password, displayName: form.displayName },
      );
      if (!ok) {
        setError(friendly(data.error, t));
        return;
      }
      if (mode === "signup" && data.confirmationRequired) {
        setDone(true);
        return;
      }
      await session.refresh();
      router.push(safeNext(next));
      router.refresh();
    } catch {
      setError(t.auth.errors.network);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="grid gap-3 text-sm leading-6">
        <p className="font-serif text-2xl">{t.auth.checkEmail}</p>
        <p className="text-muted">
          {mode === "signup" ? t.auth.confirmSent : t.auth.resetSent}
        </p>
        <Link href="/signin" className="font-semibold text-accent">{t.auth.backToSignIn}</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      {info && <FormMessage tone="info">{info}</FormMessage>}
      {mode === "signup" && <Field label={t.auth.name} name="displayName" autoComplete="name" maxLength={60} placeholder={t.auth.namePlaceholder} />}
      <Field label={t.auth.email} name="email" type="email" required autoComplete="email" />
      {mode !== "forgot" && (
        <Field
          label={t.auth.password}
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          hint={mode === "signup" ? t.auth.passwordHint : undefined}
        />
      )}
      {mode === "signin" && <Link href="/forgot-password" className="-mt-2 justify-self-end text-xs text-muted hover:text-accent">{t.auth.forgot}</Link>}
      {error && <FormMessage>{error}</FormMessage>}
      <SubmitButton pending={pending} pendingLabel={t.auth.oneMoment}>{mode === "signin" ? t.auth.signIn.submit : mode === "signup" ? t.auth.signUp.submit : t.auth.forgotPage.submit}</SubmitButton>
    </form>
  );
}

function friendly(message: unknown, t: Dictionary) {
  const text = typeof message === "string" ? message : "";
  if (/invalid login credentials/i.test(text)) return t.auth.errors.credentials;
  if (/email not confirmed/i.test(text)) return t.auth.errors.unconfirmed;
  if (/already registered|already been registered/i.test(text)) return t.auth.errors.exists;
  if (/rate limit|too many/i.test(text)) return t.auth.errors.rateLimit;
  return t.locale === "zh" ? t.auth.errors.generic : text || t.auth.errors.generic;
}
