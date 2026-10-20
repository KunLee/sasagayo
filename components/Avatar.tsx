/** Profile picture, or a monogram in the site's serif when there is none. */
export default function Avatar({ name, url, size = 40, className = "" }: { name: string; url?: string | null; size?: number; className?: string }) {
  const initials = name.trim().split(/\s+/).map((part) => Array.from(part)[0] ?? "").join("").slice(0, 2).toUpperCase() || "♪";
  return (
    <span
      // align-middle: an inline box on the text baseline gains a few pixels below it and turns oval.
      className={`inline-grid aspect-square shrink-0 place-items-center overflow-hidden rounded-full bg-ink align-middle font-serif font-semibold leading-none text-paper ${className}`}
      style={{ width: size, height: size, minWidth: size, fontSize: Math.max(12, size * 0.38) }}
      aria-hidden
    >
      {url
        // eslint-disable-next-line @next/next/no-img-element -- small, already-sized avatar from our bucket
        ? <img src={url} alt="" width={size} height={size} className="size-full object-cover" loading="lazy" />
        : initials}
    </span>
  );
}
