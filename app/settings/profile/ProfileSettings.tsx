"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Check, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";
export default function ProfileSettings() {
  const [profile, setProfile] = useState({
    displayName: "",
    handle: "",
    location: "",
    bio: "",
  });
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    fetch("/api/auth", { cache: "no-store" })
      .then((r) => r.json())
      .then(async (data) => {
        const signedIn = Boolean(data.user);
        if (signedIn) {
          const profileResponse = await fetch("/api/insights?scope=me", {
            cache: "no-store",
          });
          if (profileResponse.ok) {
            const result = await profileResponse.json();
            if (result.profile)
              setProfile({
                displayName: result.profile.display_name ?? "",
                handle: result.profile.handle ?? "",
                location: result.profile.location ?? "",
                bio: result.profile.bio ?? "",
              });
          }
          fetch("/api/admin", { cache: "no-store" })
            .then((response) => setIsAdmin(response.ok))
            .catch(() => setIsAdmin(false));
        }
        setAuthenticated(signedIn);
      })
      .catch(() => setAuthenticated(false));
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const result = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-profile",
        handle: form.get("handle"),
        displayName: form.get("displayName"),
        bio: form.get("bio"),
        location: form.get("location"),
      }),
    });
    setSaving(false);
    setMessage(
      result.ok
        ? "Your listening identity has been updated."
        : "That profile could not be saved. The handle may already be taken.",
    );
  }
  if (authenticated === null)
    return (
      <div className="grid min-h-[65vh] place-items-center">
        <LoaderCircle className="size-6 animate-spin text-[#a74735]" />
      </div>
    );
  if (!authenticated)
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <UserRound className="size-7 text-[#a74735]" />
        <h1 className="mt-5 font-serif text-5xl">Make this space yours.</h1>
        <Link
          href="/account"
          className="mt-7 rounded-full bg-[#2b2025] px-6 py-3 text-xs font-semibold text-white"
        >
          Sign in to edit your profile
        </Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-3xl px-6 py-14 sm:px-8 lg:py-20">
      <p className="micro-label text-[#a74735]">Listening identity</p>
      <h1 className="mt-3 font-serif text-5xl">Profile settings.</h1>
      <p className="mt-4 text-sm leading-7 text-stone-500">
        Give people a little context for the music and stories you share.
      </p>
      {isAdmin && (
        <Link
          href="/admin"
          className="mt-7 flex items-center gap-4 rounded-2xl border border-[var(--theme-accent)]/20 bg-[var(--theme-accent)]/5 p-5 transition hover:-translate-y-0.5"
        >
          <span className="grid size-11 place-items-center rounded-full bg-[var(--theme-accent)] text-white">
            <ShieldCheck className="size-5" />
          </span>
          <span className="flex-1">
            <strong className="block font-serif text-xl">Administrator</strong>
            <span className="mt-1 block text-xs text-stone-500">
              Open community management and private insights
            </span>
          </span>
          <span className="text-xs font-semibold text-[var(--theme-accent)]">
            Open console →
          </span>
        </Link>
      )}
      <form
        onSubmit={submit}
        className="mt-9 grid gap-5 rounded-[28px] border border-stone-900/8 bg-white/55 p-6 sm:p-8"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="displayName"
            label="Display name"
            placeholder="Your name"
            defaultValue={profile.displayName}
          />
          <Field
            name="handle"
            label="Handle"
            placeholder="curiousears"
            pattern="[a-z0-9_]{3,30}"
            defaultValue={profile.handle}
          />
          <Field
            name="location"
            label="Location"
            placeholder="Perth, Australia"
            defaultValue={profile.location}
          />
        </div>
        <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500">
          Listening note
          <textarea
            name="bio"
            maxLength={280}
            defaultValue={profile.bio}
            className="min-h-28 rounded-2xl border border-stone-900/10 bg-white p-4 text-sm font-normal leading-6 normal-case tracking-normal outline-none focus:border-[#a74735]"
            placeholder="What do you listen for?"
          />
        </label>
        {message && (
          <p role="status" className="text-xs text-emerald-700">
            {message}
          </p>
        )}
        <button
          disabled={saving}
          className="inline-flex h-11 w-fit items-center gap-3 rounded-full bg-[#a74735] px-6 text-xs font-semibold text-white"
        >
          {saving ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Save profile
        </button>
      </form>
    </div>
  );
}
function Field({
  name,
  label,
  placeholder,
  pattern,
  defaultValue,
}: {
  name: string;
  label: string;
  placeholder: string;
  pattern?: string;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500">
      {label}
      <input
        name={name}
        required
        pattern={pattern}
        defaultValue={defaultValue}
        className="h-12 rounded-2xl border border-stone-900/10 bg-white px-4 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#a74735]"
        placeholder={placeholder}
      />
    </label>
  );
}
