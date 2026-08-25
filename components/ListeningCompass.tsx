"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Compass,
  Headphones,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { circles, recommendations, stories } from "@/lib/community";

const questions = [
  {
    id: "feeling",
    label: "Right now I feel",
    options: ["Tender", "Restless", "Hopeful"],
  },
  {
    id: "time",
    label: "I have",
    options: ["One song", "A quiet half-hour", "The whole evening"],
  },
  {
    id: "company",
    label: "I want",
    options: ["Solitude", "A story", "Good company"],
  },
] as const;

type AnswerKey = (typeof questions)[number]["id"];
type Answers = Partial<Record<AnswerKey, number>>;

export default function ListeningCompass() {
  const [answers, setAnswers] = useState<Answers>({});
  const complete = questions.every((question) => answers[question.id] != null);
  const result = useMemo(() => {
    if (!complete) return null;
    const signature =
      (answers.feeling ?? 0) * 5 +
      (answers.time ?? 0) * 3 +
      (answers.company ?? 0) * 7;
    return {
      story: stories[signature % stories.length],
      circle: circles[(signature + 2) % circles.length],
      track: recommendations[(signature + 4) % recommendations.length],
    };
  }, [answers, complete]);

  return (
    <section className="border-y border-stone-900/8 bg-[var(--theme-invert)] text-[var(--theme-invert-text)]">
      <div className="mx-auto grid max-w-[1300px] gap-10 px-6 py-16 sm:px-8 lg:grid-cols-[.72fr_1.28fr] lg:py-24">
        <div className="max-w-md">
          <p className="micro-label text-[var(--theme-accent-soft)]">
            <Compass className="mr-2 inline size-3" /> Listening compass
          </p>
          <h2 className="mt-5 font-serif text-5xl leading-[.95] tracking-[-.035em] sm:text-6xl">
            Begin with how you are,
            <em className="block font-normal text-[var(--theme-accent-soft)]">
              not what is trending.
            </em>
          </h2>
          <p className="mt-6 text-sm leading-7 text-[color:color-mix(in_srgb,var(--theme-invert-text)_62%,transparent)]">
            Three small choices create a listening path through a song, a
            human story, and a room where the feeling can continue.
          </p>
          <div className="mt-8 flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-[color:color-mix(in_srgb,var(--theme-invert-text)_55%,transparent)]">
            <Sparkles className="size-3" /> No profile · no taste score · just
            this moment
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/[.055] p-5 shadow-2xl shadow-black/10 sm:p-7">
          <div className="space-y-6">
            {questions.map((question, questionIndex) => (
              <fieldset key={question.id}>
                <legend className="mb-3 flex items-center gap-3 text-xs font-semibold">
                  <span className="grid size-6 place-items-center rounded-full border border-white/15 text-[9px] text-[color:color-mix(in_srgb,var(--theme-invert-text)_55%,transparent)]">
                    0{questionIndex + 1}
                  </span>
                  {question.label}
                </legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {question.options.map((option, optionIndex) => {
                    const selected = answers[question.id] === optionIndex;
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: optionIndex,
                          }))
                        }
                        className={`min-h-12 rounded-2xl border px-4 py-3 text-left text-xs transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-soft)] ${
                          selected
                            ? "border-[var(--theme-accent-soft)] bg-[var(--theme-accent-soft)] text-[var(--theme-invert)]"
                            : "border-white/10 bg-white/[.035] text-[color:color-mix(in_srgb,var(--theme-invert-text)_62%,transparent)] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[.075] hover:text-white"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <div aria-live="polite" className="mt-7 min-h-44">
            {result ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 rounded-[24px] bg-[var(--theme-surface)] p-5 text-[var(--theme-ink)] duration-500 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="micro-label text-[var(--theme-accent)]">
                    Your path for right now
                  </p>
                  <button
                    type="button"
                    onClick={() => setAnswers({})}
                    className="inline-flex items-center gap-1 text-[10px] text-stone-500 hover:text-stone-900"
                  >
                    <RotateCcw className="size-3" /> Begin again
                  </button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Link
                    href="/catalog"
                    className="group rounded-2xl border border-stone-900/8 bg-white/50 p-4 transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    <Headphones className="size-4 text-[var(--theme-accent)]" />
                    <span className="mt-3 block text-[9px] uppercase tracking-wider text-stone-400">
                      Start with a song
                    </span>
                    <strong className="mt-1 block font-serif text-lg font-normal leading-tight">
                      {result.track.title}
                    </strong>
                    <span className="mt-2 block text-[10px] text-stone-500">
                      {result.track.mood}
                    </span>
                  </Link>
                  <Link
                    href={`/stories/${result.story.slug}`}
                    className="group rounded-2xl border border-stone-900/8 bg-white/50 p-4 transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    <Clock3 className="size-4 text-[var(--theme-accent)]" />
                    <span className="mt-3 block text-[9px] uppercase tracking-wider text-stone-400">
                      Carry a story
                    </span>
                    <strong className="mt-1 block font-serif text-lg font-normal leading-tight">
                      {result.story.title}
                    </strong>
                    <span className="mt-2 block text-[10px] text-stone-500">
                      {result.story.author}
                    </span>
                  </Link>
                  <Link
                    href={`/circles#${result.circle.slug}`}
                    className="group rounded-2xl border border-stone-900/8 bg-white/50 p-4 transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    <span
                      className="block size-4 rounded-full"
                      style={{ backgroundColor: result.circle.accent }}
                    />
                    <span className="mt-3 block text-[9px] uppercase tracking-wider text-stone-400">
                      Find your people
                    </span>
                    <strong className="mt-1 block font-serif text-lg font-normal leading-tight">
                      {result.circle.name}
                    </strong>
                    <span className="mt-2 flex items-center gap-1 text-[10px] text-stone-500">
                      Enter the circle <ArrowRight className="size-3" />
                    </span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid min-h-44 place-items-center rounded-[24px] border border-dashed border-white/12 px-6 text-center">
                <p className="max-w-sm text-xs leading-6 text-[color:color-mix(in_srgb,var(--theme-invert-text)_55%,transparent)]">
                  Choose one answer from each line. Your path appears here and
                  disappears when you leave—this moment stays yours.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
