"use client";

import { useState } from "react";
import { adminPost, type Policy } from "./types";

export default function PublishingPanel({ policy, onSaved }: { policy: Policy; onSaved: () => void }) {
  const [mode, setMode] = useState(policy.mode);
  const [publishAt, setPublishAt] = useState(policy.publishAt);
  const [reviewAt, setReviewAt] = useState(policy.reviewAt);
  const [applyToQueue, setApplyToQueue] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setPending(true);
    setMessage("");
    try {
      const result = await adminPost<{ applied: { published: number; toReview: number } | null }>({
        action: "save-policy", policy: { mode, publishAt, reviewAt }, applyToQueue,
      });
      setMessage(result.applied
        ? `Saved. ${result.applied.published} waiting recordings were published and ${result.applied.toReview} rejected ones moved to review.`
        : "Saved. The new rules apply from the next discovery run.");
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setPending(false);
    }
  }

  const modes = [
    { id: "auto", title: "Automatic", body: `Recordings scoring ${publishAt}+ go live straight away. Those between ${reviewAt} and ${publishAt - 1} wait for you.` },
    { id: "manual", title: "Manual", body: `Nothing goes live without an editor. Everything scoring ${reviewAt}+ waits in the review queue.` },
  ] as const;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-8">
        <section>
          <h2 className="display text-3xl">How new music is published</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {modes.map((item) => (
              <label key={item.id} className={`cursor-pointer rounded-2xl border p-5 transition ${mode === item.id ? "border-accent bg-accent-soft" : "border-line bg-card hover:border-accent"}`}>
                <input type="radio" name="mode" value={item.id} checked={mode === item.id} onChange={() => setMode(item.id)} className="sr-only" />
                <span className="font-serif text-2xl">{item.title}</span>
                <span className="mt-2 block text-sm leading-6 text-muted">{item.body}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="grid gap-6">
          <h2 className="display text-3xl">Score thresholds</h2>
          <Slider label="Publish at" hint={mode === "auto" ? "Scores at or above this go live automatically." : "In manual mode this only orders the queue."} value={publishAt} min={30} max={100} onChange={(value) => { setPublishAt(value); if (reviewAt > value) setReviewAt(value); }} />
          <Slider label="Keep for review at" hint="Below this, recordings are rejected (they stay searchable in “All music → Rejected”)." value={reviewAt} min={25} max={publishAt} onChange={setReviewAt} />
          <div className="relative h-3 overflow-hidden rounded-full bg-paper-2" aria-hidden>
            <div className="absolute inset-y-0 left-0 bg-muted/30" style={{ width: `${reviewAt}%` }} />
            <div className="absolute inset-y-0 bg-gold/60" style={{ left: `${reviewAt}%`, width: `${publishAt - reviewAt}%` }} />
            <div className="absolute inset-y-0 right-0 bg-accent" style={{ left: `${publishAt}%` }} />
          </div>
          <p className="-mt-3 flex justify-between text-[11px] text-muted"><span>rejected</span><span>review</span><span>{mode === "auto" ? "published" : "review (top)"}</span></p>
        </section>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={applyToQueue} onChange={(event) => setApplyToQueue(event.target.checked)} className="size-4 accent-[var(--accent)]" />
            Also apply to recordings already waiting
          </label>
          <button type="button" onClick={save} disabled={pending} className="h-11 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink disabled:opacity-60">
            {pending ? "Saving…" : "Save publishing rules"}
          </button>
        </div>
        {message && <p role="status" className="rounded-xl border border-line bg-card px-4 py-3 text-sm">{message}</p>}
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-card p-5 text-sm leading-6 text-muted">
        <p className="font-semibold text-ink">How scores work</p>
        <p className="mt-2">Every file starts at 50. Credited performers, full-length works, recognisable titles and trusted collections (Musopen, Featured sounds) add points; short pieces, missing credits and low bitrates take them away.</p>
        <p className="mt-2">MIDI, synthesised renderings, spoken word, excerpts, remixes and non-free licences are capped at 20 and never reach review.</p>
        <p className="mt-2">Your own decisions are never overridden: re-applying rules only touches recordings no editor has judged.</p>
      </aside>
    </div>
  );
}

function Slider({ label, hint, value, min, max, onChange }: { label: string; hint: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-2">
      <span className="flex items-baseline justify-between"><span className="text-sm font-semibold">{label}</span><span className="font-serif text-3xl tabular-nums">{value}</span></span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="accent-[var(--accent)]" />
      <span className="text-xs text-muted">{hint}</span>
    </label>
  );
}
