"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, Music2 } from "lucide-react";

type User = { id: string; email?: string };

export default function AccountClient() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth", { cache: "no-store" })
      .then(async (response) => {
        if (response.ok) setUser((await response.json()).user);
      })
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: mode,
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const payload = await response.json();
    setSubmitting(false);
    if (!response.ok) return setMessage(payload.error ?? "Something went wrong.");
    if (payload.confirmationRequired) {
      return setMessage("Check your inbox to confirm your email, then sign in.");
    }
    setUser(payload.user);
  }

  async function logout() {
    setSubmitting(true);
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setUser(null);
    setSubmitting(false);
  }

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden">
      <div className="account-orb account-orb-one" />
      <div className="account-orb account-orb-two" />
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:px-8 lg:grid-cols-[1fr_.8fr] lg:items-center lg:py-24">
        <section className="relative z-10 max-w-xl">
          <p className="micro-label text-[#a74735]">Your listening identity</p>
          <h1 className="mt-5 font-serif text-5xl leading-[.95] tracking-[-.04em] sm:text-7xl">
            Keep the music<br />that keeps <em className="font-normal text-[#a74735]">you.</em>
          </h1>
          <p className="mt-6 max-w-lg text-sm leading-7 text-stone-600 sm:text-base">
            Save discoveries, publish the stories behind your songs, and build a library that feels unmistakably yours.
          </p>
          <div className="mt-9 grid max-w-lg gap-3 sm:grid-cols-3">
            {["Private by default", "Human recommendations", "Your files, your story"].map((item) => (
              <div key={item} className="rounded-2xl border border-stone-900/8 bg-white/45 p-4 text-xs font-medium text-stone-700 backdrop-blur">
                <CheckCircle2 className="mb-3 size-4 text-[#a74735]" />{item}
              </div>
            ))}
          </div>
        </section>

        <section className="relative z-10 rounded-[32px] border border-stone-900/8 bg-[#fffaf2]/90 p-6 shadow-2xl shadow-stone-900/8 backdrop-blur sm:p-9">
          {loading ? (
            <div className="grid min-h-80 place-items-center"><LoaderCircle className="size-6 animate-spin text-[#a74735]" /></div>
          ) : user ? (
            <div className="flex min-h-80 flex-col justify-between">
              <div>
                <span className="grid size-14 place-items-center rounded-2xl bg-[#2b2025] text-white"><Music2 className="size-6" /></span>
                <p className="micro-label mt-8 text-[#a74735]">You are listening as</p>
                <h2 className="mt-3 break-all font-serif text-3xl">{user.email ?? "Sasagayo member"}</h2>
                <p className="mt-4 text-sm leading-6 text-stone-500">Your session is protected by secure HTTP-only cookies.</p>
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/studio" className="inline-flex h-11 items-center gap-6 rounded-full bg-[#a74735] px-5 text-xs font-semibold text-white">Open your studio <ArrowRight className="size-4" /></Link>
                <button onClick={logout} disabled={submitting} className="h-11 rounded-full border border-stone-900/12 px-5 text-xs font-semibold">Sign out</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex rounded-full bg-stone-900/5 p-1">
                {(["login", "signup"] as const).map((item) => (
                  <button key={item} onClick={() => { setMode(item); setMessage(""); }} className={`h-9 flex-1 rounded-full text-xs font-semibold capitalize transition ${mode === item ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>{item === "login" ? "Sign in" : "Create account"}</button>
                ))}
              </div>
              <div className="mt-8 flex items-center gap-3"><LockKeyhole className="size-5 text-[#a74735]" /><h2 className="font-serif text-3xl">{mode === "login" ? "Welcome back." : "Join the circle."}</h2></div>
              <form onSubmit={submit} className="mt-7 grid gap-4">
                <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[.12em] text-stone-500">Email<input required name="email" type="email" autoComplete="email" className="h-12 rounded-2xl border border-stone-900/10 bg-white px-4 text-sm normal-case tracking-normal outline-none focus:border-[#a74735] focus:ring-3 focus:ring-[#a74735]/10" placeholder="you@example.com" /></label>
                <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[.12em] text-stone-500">Password<input required minLength={8} name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} className="h-12 rounded-2xl border border-stone-900/10 bg-white px-4 text-sm normal-case tracking-normal outline-none focus:border-[#a74735] focus:ring-3 focus:ring-[#a74735]/10" placeholder="At least 8 characters" /></label>
                {message && <p role="status" className="rounded-xl bg-[#a74735]/8 px-4 py-3 text-xs leading-5 text-[#8d3c2d]">{message}</p>}
                <button disabled={submitting} className="mt-2 inline-flex h-12 items-center justify-center gap-3 rounded-full bg-[#2b2025] text-xs font-semibold text-white transition hover:bg-[#a74735] disabled:opacity-60">{submitting && <LoaderCircle className="size-4 animate-spin" />}{mode === "login" ? "Sign in to Sasagayo" : "Create my account"}<ArrowRight className="size-4" /></button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
