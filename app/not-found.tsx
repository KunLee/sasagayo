import Link from "next/link";

export const metadata = {
  title: "Page not found",
};

// Deliberately distinct from app/error.tsx and app/global-error.tsx: no
// digest, no error-reporting call, and different copy/styling, so a missing
// route can never be mistaken for a render error in the UI or in reports.
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="micro-label text-stone-500">Lost your place?</p>
      <h1 className="font-serif text-3xl">We couldn&apos;t find that page</h1>
      <p className="text-sm text-stone-600">
        Nothing broke here — this address just doesn&apos;t lead anywhere
        yet. Let&apos;s get you back to the music.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-[#2b2025] px-4 py-2 text-xs font-semibold text-white"
      >
        Return home
      </Link>
    </div>
  );
}
