"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  LoaderCircle,
  Music2,
  PenLine,
  Sparkles,
} from "lucide-react";

export default function StoryComposer() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(1);
  const [media, setMedia] = useState<Array<{ id: string; file_name: string; mime_type: string; status: string }>>([]);
  useEffect(() => {
    fetch("/api/auth", { cache: "no-store" })
      .then((r) => r.json())
      .then(async (data) => {
        setReady(Boolean(data.user));
        if (data.user) {
          const mediaResponse = await fetch("/api/media", { cache: "no-store" });
          if (mediaResponse.ok) setMedia((await mediaResponse.json()).assets ?? []);
        }
      })
      .catch(() => setReady(false));
  }, []);
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const result = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "publish-story",
        title: form.get("title"),
        excerpt: form.get("excerpt"),
        body: form.get("body"),
        category: form.get("category"),
        mood: form.get("mood"),
        trackTitle: form.get("trackTitle"),
        artistName: form.get("artistName"),
        externalUrl: form.get("externalUrl"),
        mediaAssetId: form.get("mediaAssetId"),
      }),
    });
    const payload = await result.json();
    setSubmitting(false);
    if (!result.ok)
      return setMessage(payload.error ?? "Could not publish your story.");
    router.push(`/stories/${payload.story.slug}`);
  }
  if (ready === null)
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <LoaderCircle className="size-6 animate-spin text-[#a74735]" />
      </div>
    );
  if (!ready)
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <PenLine className="size-7 text-[#a74735]" />
        <h1 className="mt-5 font-serif text-5xl">
          Your story starts after sign-in.
        </h1>
        <p className="mt-4 text-sm leading-7 text-stone-500">
          A listening identity keeps your stories, conversations, and saved
          recommendations together.
        </p>
        <Link
          href="/account"
          className="mt-7 rounded-full bg-[#2b2025] px-6 py-3 text-xs font-semibold text-white"
        >
          Sign in or create an account
        </Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:px-8 lg:py-16">
      <Link
        href="/stories"
        className="inline-flex items-center gap-2 text-xs text-stone-500"
      >
        <ArrowLeft className="size-4" />
        Back to stories
      </Link>
      <header className="mt-9 max-w-3xl">
        <p className="micro-label text-[#a74735]">
          <Sparkles className="mr-2 inline size-3" />
          Recommend like a human
        </p>
        <h1 className="mt-4 font-serif text-6xl tracking-[-.045em]">
          Give the song
          <br />
          <em className="font-normal text-[#a74735]">a place to live.</em>
        </h1>
        <p className="mt-5 text-sm leading-7 text-stone-500">
          Start with the music, then tell us where it found you. You can edit
          before publishing.
        </p>
      </header>
      <div className="mt-10 flex gap-2">
        {[1, 2].map((number) => (
          <span
            key={number}
            className={`h-1.5 flex-1 rounded-full ${number <= step ? "bg-[#a74735]" : "bg-stone-900/8"}`}
          />
        ))}
      </div>
      <form
        onSubmit={publish}
        className="mt-8 rounded-[30px] border border-stone-900/8 bg-white/55 p-6 sm:p-9"
      >
        <section className={step === 1 ? "block" : "hidden"}>
          <div className="flex items-center gap-3">
            <Music2 className="size-5 text-[#a74735]" />
            <h2 className="font-serif text-3xl">The music</h2>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <Field
              name="trackTitle"
              label="Track title"
              placeholder="Orange Moon"
              required
            />
            <Field
              name="artistName"
              label="Artist"
              placeholder="Erykah Badu"
              required
            />
            <Field
              name="mood"
              label="Mood or moment"
              placeholder="Slow Sunday morning"
            />
            <Field
              name="externalUrl"
              label="Listening link (optional)"
              placeholder="https://…"
              type="url"
            />
            {media.some((asset) => asset.status === "ready") && (
              <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500 sm:col-span-2">
                Attach from your studio (optional)
                <select name="mediaAssetId" className="h-12 rounded-2xl border border-stone-900/10 bg-white px-4 text-sm font-normal normal-case tracking-normal outline-none">
                  <option value="">No uploaded file</option>
                  {media.filter((asset) => asset.status === "ready").map((asset) => <option key={asset.id} value={asset.id}>{asset.file_name} · {asset.mime_type}</option>)}
                </select>
              </label>
            )}
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="mt-8 inline-flex h-11 items-center gap-7 rounded-full bg-[#2b2025] px-5 text-xs font-semibold text-white"
          >
            Continue to your story <Check className="size-4" />
          </button>
        </section>
        <section className={step === 2 ? "block" : "hidden"}>
          <div className="flex items-center gap-3">
            <PenLine className="size-5 text-[#a74735]" />
            <h2 className="font-serif text-3xl">The story</h2>
          </div>
          <div className="mt-7 grid gap-5">
            <Field
              name="title"
              label="Title"
              placeholder="The song my father left in the glovebox"
              required
            />
            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500">
              Category
              <select
                name="category"
                className="h-12 rounded-2xl border border-stone-900/10 bg-white px-4 text-sm font-normal normal-case tracking-normal outline-none"
              >
                <option value="memory">Memory</option>
                <option value="discovery">Discovery</option>
                <option value="reflection">Reflection</option>
                <option value="ritual">Ritual</option>
              </select>
            </label>
            <Area
              name="excerpt"
              label="A short invitation"
              placeholder="In one or two sentences, invite someone into the moment…"
              maxLength={320}
            />
            <Area
              name="body"
              label="Tell the whole story"
              placeholder="Where were you? What changed when the song began? Why should someone hear it now?"
              maxLength={12000}
              large
            />
          </div>
          {message && (
            <p
              role="status"
              className="mt-5 rounded-xl bg-red-50 p-3 text-xs text-red-700"
            >
              {message}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-11 rounded-full border border-stone-900/10 px-5 text-xs font-semibold"
            >
              Back
            </button>
            <button
              disabled={submitting}
              className="inline-flex h-11 items-center gap-3 rounded-full bg-[#a74735] px-6 text-xs font-semibold text-white disabled:opacity-60"
            >
              {submitting && <LoaderCircle className="size-4 animate-spin" />}
              Publish to Sasagayo
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
function Field({
  name,
  label,
  placeholder,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="h-12 rounded-2xl border border-stone-900/10 bg-white px-4 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#a74735]"
        placeholder={placeholder}
      />
    </label>
  );
}
function Area({
  name,
  label,
  placeholder,
  maxLength,
  large = false,
}: {
  name: string;
  label: string;
  placeholder: string;
  maxLength: number;
  large?: boolean;
}) {
  return (
    <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500">
      {label}
      <textarea
        name={name}
        required
        minLength={large ? 20 : 10}
        maxLength={maxLength}
        className={`${large ? "min-h-56" : "min-h-28"} resize-y rounded-2xl border border-stone-900/10 bg-white p-4 text-sm font-normal leading-7 normal-case tracking-normal outline-none focus:border-[#a74735]`}
        placeholder={placeholder}
      />
    </label>
  );
}
