import type { ReactNode } from "react";

export default function AuthCard({ eyebrow, title, intro, children, footer }: { eyebrow: string; title: string; intro?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="paper-grain min-h-[70vh]">
      <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-3 text-5xl">{title}</h1>
        {intro && <div className="mt-4 text-sm leading-6 text-muted">{intro}</div>}
        <div className="mt-8 rounded-3xl border border-line bg-card p-6 shadow-[0_30px_60px_-45px_rgb(0_0_0/0.5)] sm:p-8">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-ink-2">{label}</span>
      <input {...props} className="h-12 rounded-xl border border-line bg-paper px-4 text-base outline-none transition focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]" />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button type="submit" disabled={pending} className="mt-2 h-12 w-full rounded-xl bg-ink font-semibold text-paper transition hover:bg-accent hover:text-accent-ink disabled:opacity-60">
      {pending ? "One moment…" : children}
    </button>
  );
}

export function FormMessage({ tone = "error", children }: { tone?: "error" | "info"; children: ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${tone === "error" ? "bg-accent-soft text-accent" : "bg-paper-2 text-ink-2"}`}>
      {children}
    </p>
  );
}
