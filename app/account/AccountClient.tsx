"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import AuthCard, { Field, FormMessage, SubmitButton } from "@/components/auth/AuthCard";
import { useSession } from "@/components/SessionProvider";
import { useLibrary } from "@/lib/library-store";

export default function AccountClient({ passwordUpdated }: { passwordUpdated: boolean }) {
  const router = useRouter();
  const session = useSession();
  const library = useLibrary();
  const [message, setMessage] = useState(passwordUpdated ? "Your new password is saved." : "");
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
    if (!response.ok) { setError(data.error ?? "Could not save."); return; }
    session.setAccount({ ...account!, displayName: data.account.displayName });
    setMessage("Saved.");
  }

  return (
    <AuthCard
      eyebrow={account.role === "admin" ? "Editor account" : "Your account"}
      title={`Hello, ${account.displayName}`}
      intro={<>Signed in as <span className="font-medium text-ink-2">{account.email}</span></>}
      footer={<button type="button" onClick={async () => { await session.signOut(); router.push("/"); }} className="font-semibold text-accent">Sign out</button>}
    >
      <div className="grid gap-6">
        {account.status === "suspended" && (
          <FormMessage>This account is suspended. You can still listen, but your library can&apos;t be changed. Contact us via the About page if you think this is a mistake.</FormMessage>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/library" className="rounded-2xl border border-line p-4 transition hover:border-accent">
            <span className="block font-serif text-3xl tabular-nums">{library.tracks.length}</span>
            <span className="text-xs text-muted">saved recordings{library.sync === "error" ? " · sync problem" : ""}</span>
          </Link>
          {account.role === "admin" ? (
            <Link href="/admin" className="rounded-2xl border border-line p-4 transition hover:border-accent">
              <span className="block font-serif text-3xl">Desk</span>
              <span className="text-xs text-muted">Editor tools →</span>
            </Link>
          ) : (
            <div className="rounded-2xl border border-line p-4">
              <span className="block font-serif text-3xl">Listener</span>
              <span className="text-xs text-muted">Free account</span>
            </div>
          )}
        </div>
        <form onSubmit={save} className="grid gap-3">
          <Field label="Display name" name="displayName" defaultValue={account.displayName} required maxLength={60} />
          {message && <FormMessage tone="info">{message}</FormMessage>}
          {error && <FormMessage>{error}</FormMessage>}
          <SubmitButton pending={pending}>Save</SubmitButton>
        </form>
        <p className="text-xs text-muted">
          To change your password, <Link href="/forgot-password" className="text-accent hover:underline">request a reset link</Link>.
        </p>
      </div>
    </AuthCard>
  );
}
