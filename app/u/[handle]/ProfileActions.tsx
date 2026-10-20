"use client";

import Link from "next/link";
import { Flag, PenLine } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/components/I18nProvider";
import { useSession } from "@/components/SessionProvider";

/** "Edit profile" for the owner; "Report" for other signed-in listeners. */
export default function ProfileActions({ handle, ownerId, displayName }: { handle: string; ownerId: string; displayName: string }) {
  const { t } = useI18n();
  const session = useSession();
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  if (session.loading) return null;
  if (session.account?.id === ownerId) {
    return (
      <Link href="/account" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper hover:bg-accent hover:text-accent-ink">
        <PenLine className="size-4" />{t.profile.edit}
      </Link>
    );
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError("");
    const response = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle, reason: String(new FormData(event.currentTarget).get("reason") ?? "") }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setState("idle"); setError(data.error ?? t.auth.errors.generic); return; }
    setState("sent");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setState("idle"); setError(""); dialog.current?.showModal(); }}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs text-muted hover:text-accent"
      >
        <Flag className="size-3.5" />{t.profile.report}
      </button>
      <dialog
        ref={dialog}
        aria-label={t.profile.reportTitle}
        onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl border border-line bg-card p-0 text-left text-ink shadow-2xl backdrop:bg-black/50"
      >
        <div className="p-6">
          <p className="font-serif text-2xl">{t.profile.reportTitle}</p>
          <p className="mt-1 text-sm text-muted">{displayName} · @{handle}</p>
          {!session.account ? (
            <p className="mt-5 text-sm">
              {t.profile.reportSignIn} <Link href={`/signin?next=/u/${handle}`} className="font-semibold text-accent">{t.nav.signIn} →</Link>
            </p>
          ) : state === "sent" ? (
            <p role="status" className="mt-5 rounded-xl bg-paper-2 px-4 py-3 text-sm">{t.profile.reportSent}</p>
          ) : (
            <form onSubmit={send} className="mt-4 grid gap-3">
              <p className="text-sm leading-6 text-muted">{t.profile.reportIntro}</p>
              <textarea name="reason" required minLength={10} maxLength={500} rows={4} placeholder={t.profile.reportPlaceholder} className="rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none focus:border-accent" />
              {error && <p role="alert" className="text-sm text-accent">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => dialog.current?.close()} className="h-10 rounded-full px-4 text-sm text-muted">{t.profile.cancel}</button>
                <button type="submit" disabled={state === "sending"} className="h-10 rounded-full bg-ink px-5 text-sm font-semibold text-paper disabled:opacity-60">{t.profile.reportSend}</button>
              </div>
            </form>
          )}
          {(state === "sent" || !session.account) && (
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => dialog.current?.close()} className="h-10 rounded-full border border-line px-4 text-sm">{t.share.close}</button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
