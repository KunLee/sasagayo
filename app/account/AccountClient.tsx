"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import Avatar from "@/components/Avatar";
import { Field, FormMessage, SubmitButton } from "@/components/auth/AuthCard";
import { useI18n } from "@/components/I18nProvider";
import { useSession, type Account } from "@/components/SessionProvider";
import { useLibrary } from "@/lib/library-store";
import AvatarEditor from "./AvatarEditor";
import ComposerPicker from "./ComposerPicker";

export default function AccountClient({ passwordUpdated }: { passwordUpdated: boolean }) {
  const router = useRouter();
  const session = useSession();
  const account = session.account;

  useEffect(() => {
    if (!session.loading && !account) router.replace("/signin?next=/account");
  }, [session.loading, account, router]);

  if (!account) return <div className="min-h-[60vh]" />;
  // Keyed by id so a different sign-in starts with fresh form state.
  return <ProfileEditor key={account.id} account={account} passwordUpdated={passwordUpdated} />;
}

function ProfileEditor({ account, passwordUpdated }: { account: Account; passwordUpdated: boolean }) {
  const router = useRouter();
  const session = useSession();
  const library = useLibrary();
  const { t } = useI18n();
  const [favourites, setFavourites] = useState(account.favoriteComposers);
  const [handle, setHandle] = useState(account.handle);
  const [message, setMessage] = useState(passwordUpdated ? t.account.passwordSaved : "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const origin = typeof window === "undefined" ? "" : window.location.host;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: String(form.get("handle") ?? ""),
        displayName: String(form.get("displayName") ?? ""),
        motto: String(form.get("motto") ?? ""),
        bio: String(form.get("bio") ?? ""),
        favoriteComposers: favourites,
        libraryPublic: form.get("libraryPublic") === "on",
      }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) { setError(data.error ?? t.auth.errors.generic); return; }
    session.setAccount(data.account);
    setMessage(t.editProfile.saved);
    router.refresh();
  }

  const box = "rounded-3xl border border-line bg-card p-6 sm:p-8";
  return (
    <div className="paper-grain">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-[300px_1fr]">
        <aside className="grid h-fit gap-4">
          <div className={`${box} text-center`}>
            <Avatar name={account.displayName} url={account.avatarUrl} size={96} className="mx-auto" />
            <p className="display mt-4 text-3xl">{account.displayName}</p>
            <p className="mt-1 text-sm text-muted">@{account.handle}</p>
            {account.motto && <p className="mt-3 font-serif text-lg italic text-ink-2">“{account.motto}”</p>}
            <Link href={`/u/${account.handle}`} className="mt-4 inline-block text-sm font-semibold text-accent">{t.editProfile.view}</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/library" className="rounded-2xl border border-line bg-card p-4 transition hover:border-accent">
              <span className="block font-serif text-3xl tabular-nums">{library.tracks.length}</span>
              <span className="text-xs text-muted">{t.account.savedRecordings}{library.sync === "error" ? t.account.syncProblem : ""}</span>
            </Link>
            {account.role === "admin" ? (
              <Link href="/admin" className="rounded-2xl border border-line bg-card p-4 transition hover:border-accent">
                <span className="block font-serif text-3xl">{t.account.desk}</span>
                <span className="text-xs text-muted">{t.account.editorTools}</span>
              </Link>
            ) : (
              <div className="rounded-2xl border border-line bg-card p-4">
                <span className="block font-serif text-3xl">{t.account.listener}</span>
                <span className="text-xs text-muted">{t.account.freeAccount}</span>
              </div>
            )}
          </div>
          <div className="px-2 text-xs leading-6 text-muted">
            <p>{t.account.signedInAs} <span className="font-medium text-ink-2">{account.email}</span></p>
            <p>{t.account.changePasswordA} <Link href="/forgot-password" className="text-accent hover:underline">{t.account.changePasswordLink}</Link>{t.locale === "zh" ? "。" : "."}</p>
            <button type="button" onClick={async () => { await session.signOut(); router.push("/"); }} className="mt-2 font-semibold text-accent">{t.account.signOut}</button>
          </div>
        </aside>

        <section className={box}>
          <p className="eyebrow">{account.role === "admin" ? t.account.editorEyebrow : t.account.eyebrow}</p>
          <h1 className="display mt-3 text-4xl">{t.editProfile.title}</h1>
          <p className="mt-2 text-sm text-muted">{t.editProfile.intro}</p>
          {account.status === "suspended" && <div className="mt-6"><FormMessage>{t.account.suspended}</FormMessage></div>}

          <div className="mt-8 border-b border-line pb-8">
            <AvatarEditor name={account.displayName} url={account.avatarUrl} onChange={(avatarUrl) => { session.setAccount({ ...account, avatarUrl }); router.refresh(); }} />
          </div>

          <form onSubmit={save} className="mt-8 grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={t.editProfile.handle}
                name="handle"
                value={handle}
                onChange={(event) => setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30))}
                required
                minLength={3}
                maxLength={30}
                autoComplete="username"
                hint={t.editProfile.handleHint(`${origin}/u/${handle || "…"}`)}
              />
              <Field label={t.editProfile.displayName} name="displayName" defaultValue={account.displayName} required maxLength={60} autoComplete="name" />
            </div>
            <Field label={t.editProfile.motto} name="motto" defaultValue={account.motto} maxLength={80} placeholder={t.editProfile.mottoPlaceholder} />
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-ink-2">{t.editProfile.bio}</span>
              <textarea name="bio" defaultValue={account.bio} maxLength={280} rows={3} placeholder={t.editProfile.bioPlaceholder} className="rounded-xl border border-line bg-paper px-4 py-3 text-base outline-none transition focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]" />
            </label>
            <ComposerPicker value={favourites} onChange={setFavourites} />
            <label className="flex items-start gap-3 rounded-2xl border border-line p-4">
              <input type="checkbox" name="libraryPublic" defaultChecked={account.libraryPublic} className="mt-1 size-4 accent-[var(--accent)]" />
              <span>
                <span className="block text-sm font-semibold">{t.editProfile.libraryPublic}</span>
                <span className="text-xs text-muted">{t.editProfile.libraryPublicHint}</span>
              </span>
            </label>
            {message && <FormMessage tone="info">{message}</FormMessage>}
            {error && <FormMessage>{error}</FormMessage>}
            <SubmitButton pending={pending} pendingLabel={t.auth.oneMoment}>{t.editProfile.save}</SubmitButton>
          </form>
        </section>
      </div>
    </div>
  );
}
