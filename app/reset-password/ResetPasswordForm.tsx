"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/auth/AuthCard";
import { useSession } from "@/components/SessionProvider";

type Tokens = { accessToken: string; refreshToken: string };

/** Supabase's recovery email lands here with the session in the URL fragment. */
export default function ResetPasswordForm() {
  const router = useRouter();
  const session = useSession();
  const [tokens, setTokens] = useState<Tokens | null | undefined>(undefined);
  const [linkError, setLinkError] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    // Remove the tokens from the address bar and history straight away.
    window.history.replaceState(null, "", window.location.pathname);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    // Reading the fragment is only possible after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLinkError(params.get("error_description") ?? "");
    setTokens(accessToken && refreshToken ? { accessToken, refreshToken } : null);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tokens) return;
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirm")) { setError("The two passwords don't match."); return; }
    setPending(true);
    setError("");
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", password: form.get("password"), ...tokens }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) { setError(data.error ?? "Could not update your password."); return; }
    await session.refresh();
    router.push("/account?updated=1");
  }

  if (tokens === undefined) return <p className="text-sm text-muted">Checking your link…</p>;
  if (!tokens) {
    return (
      <div className="grid gap-3 text-sm">
        <FormMessage>{linkError || "This link is invalid or has expired."}</FormMessage>
        <Link href="/forgot-password" className="font-semibold text-accent">Request a new link →</Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <Field label="New password" name="password" type="password" required minLength={8} autoComplete="new-password" hint="At least 8 characters." />
      <Field label="Repeat it" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      {error && <FormMessage>{error}</FormMessage>}
      <SubmitButton pending={pending}>Save password</SubmitButton>
    </form>
  );
}
