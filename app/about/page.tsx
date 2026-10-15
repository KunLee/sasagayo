import type { Metadata } from "next";
import Link from "next/link";
import { PUBLISH_AT } from "@/lib/discovery/quality";

export const metadata: Metadata = {
  title: "About",
  description: "How Sasagayo finds, checks, and credits open classical recordings.",
};

const RULES = [
  ["Real performances only", "MIDI files, synthesised renderings, music-theory examples, and multitrack stems are rejected automatically."],
  ["Whole pieces, not snippets", "Anything under a minute is skipped; full movements and complete works rank higher."],
  ["A licence you can rely on", "Only public domain, CC0, CC BY, and CC BY-SA recordings are published. Non-commercial or no-derivatives licences never are."],
  ["Credit where it is due", "Performers are identified from each file's metadata, and every recording carries its attribution and a link to its source."],
  ["Listenable quality", "Low-bitrate copies and degraded derivatives are filtered out; curated collections such as Musopen are favoured."],
  ["A human in the loop", `Recordings scoring ${PUBLISH_AT}+ are published straight away. Borderline ones wait for an editor's decision.`],
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="eyebrow">About Sasagayo</p>
      <h1 className="display mt-4 text-[clamp(3rem,7vw,5.5rem)]">Music that belongs to everyone.</h1>
      <div className="mt-8 grid gap-5 text-base leading-8 text-ink-2">
        <p>
          Thousands of superb classical recordings are already free — released into the public domain by orchestras and
          military bands, given away by performers under Creative Commons, or recorded long enough ago that their rights have
          expired. They are scattered across archives, poorly labelled, and hard to listen to.
        </p>
        <p>
          Sasagayo gathers them into one calm, searchable library. Every day it works through the archives composer by
          composer, judges each file, and adds the good ones. You can listen without an account, save favourites, and share
          a recording — or a whole mix — with a single link.
        </p>
      </div>

      <p className="ornament mt-16 font-serif text-xl">❦</p>

      <h2 className="display mt-12 text-4xl">How recordings are chosen</h2>
      <dl className="mt-8 grid gap-6 sm:grid-cols-2">
        {RULES.map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-line bg-card p-5">
            <dt className="font-serif text-xl">{title}</dt>
            <dd className="mt-2 text-sm leading-6 text-muted">{body}</dd>
          </div>
        ))}
      </dl>

      <h2 className="display mt-16 text-4xl">Sources</h2>
      <p className="mt-4 text-sm leading-7 text-ink-2">
        Recordings stream directly from <a className="text-accent hover:underline" href="https://commons.wikimedia.org" target="_blank" rel="noreferrer">Wikimedia Commons</a> and
        the <a className="text-accent hover:underline" href="https://archive.org/details/musopen" target="_blank" rel="noreferrer">Internet Archive&apos;s Musopen collection</a>.
        Composer portraits and biographies come from Wikipedia. Each recording page links to its original file and licence, so
        you can always verify the rights yourself. If you believe a recording is listed in error, please get in touch and it
        will be removed promptly.
      </p>

      <h2 className="display mt-16 text-4xl">Contact</h2>
      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-5"><dt className="text-xs text-muted">Email</dt><dd className="mt-1"><a href="mailto:Kun.li@ibm.com" className="text-accent hover:underline">Kun.li@ibm.com</a></dd></div>
        <div className="rounded-2xl border border-line bg-card p-5"><dt className="text-xs text-muted">Phone</dt><dd className="mt-1"><a href="tel:+61451856126" className="text-accent hover:underline">+61 0451 856 126</a></dd></div>
      </dl>
      <p className="mt-10 text-sm"><Link href="/" className="font-semibold text-accent">← Back to listening</Link></p>
    </div>
  );
}
