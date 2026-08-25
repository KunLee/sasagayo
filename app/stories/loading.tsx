export default function StoriesLoading() {
  return (
    <div
      className="mx-auto min-h-[70vh] max-w-[1300px] animate-pulse px-6 py-14 sm:px-8 lg:py-20"
      role="status"
      aria-label="Loading stories"
    >
      <div className="border-b border-stone-900/8 pb-12">
        <p className="micro-label text-[var(--theme-accent)]">
          Opening the story journal…
        </p>
        <div className="h-2 w-28 rounded-full bg-stone-900/10" />
        <div className="mt-6 h-14 max-w-2xl rounded-2xl bg-stone-900/8 sm:h-20" />
        <div className="mt-4 h-14 max-w-xl rounded-2xl bg-stone-900/6" />
      </div>
      <div className="mt-10 flex gap-2">
        {[1, 2, 3, 4].map((item) => (
          <span key={item} className="h-8 w-24 rounded-full bg-stone-900/7" />
        ))}
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-72 rounded-[26px] border border-stone-900/6 bg-white/40"
          />
        ))}
      </div>
      <span className="sr-only">Loading stories…</span>
    </div>
  );
}
