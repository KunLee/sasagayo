"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useSession } from "@/components/SessionProvider";
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
        setError(friendly(data.error));
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
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="grid gap-3 text-sm leading-6">
        <p className="font-serif text-2xl">Check your email</p>
        <p className="text-muted">
          {mode === "signup"
            ? "We've sent a confirmation link. Open it, then sign in — your saved music will be waiting."
            : "If that address has an account, a link to choose a new password is on its way."}
        </p>
        <Link href="/signin" className="font-semibold text-accent">Back to sign in →</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      {info && <FormMessage tone="info">{info}</FormMessage>}
      {mode === "signup" && <Field label="Your name" name="displayName" autoComplete="name" maxLength={60} placeholder="How should we greet you?" />}
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      {mode !== "forgot" && (
        <Field
          label="Password"
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          hint={mode === "signup" ? "At least 8 characters." : undefined}
        />
      )}
      {mode === "signin" && <Link href="/forgot-password" className="-mt-2 justify-self-end text-xs text-muted hover:text-accent">Forgot password?</Link>}
      {error && <FormMessage>{error}</FormMessage>}
      <SubmitButton pending={pending}>{mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}</SubmitButton>
    </form>
  );
}

function friendly(message: unknown) {
  const text = typeof message === "string" ? message : "";
  if (/invalid login credentials/i.test(text)) return "That email and password don't match an account.";
  if (/email not confirmed/i.test(text)) return "Please confirm your email first — check your inbox for our link.";
  if (/already registered|already been registered/i.test(text)) return "An account with this email already exists. Try signing in.";
  if (/rate limit|too many/i.test(text)) return "Too many attempts. Please wait a minute and try again.";
  return text || "Something went wrong. Please try again.";
}
