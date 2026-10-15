import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-28 text-center">
      <p className="font-serif text-2xl text-gold">𝄐</p>
      <h1 className="display mt-4 text-5xl">A rest in the score</h1>
      <p className="mt-4 text-sm text-muted">This page does not exist, or the recording has been withdrawn.</p>
      <Link href="/" className="mt-8 inline-block rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper">Back to the library</Link>
    </div>
  );
}
