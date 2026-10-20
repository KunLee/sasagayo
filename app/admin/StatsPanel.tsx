"use client";

import { ArrowDownRight, ArrowUpRight, LoaderCircle, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { COMPOSER_BY_SLUG } from "@/lib/composers";

type Day = { day: string; visitors: number; pageviews: number; plays: number; minutes: number; signups: number; logins: number };
type Row = { label: string; value: number; detail?: string; results?: number };
type Stats = {
  days: number;
  daily: Day[];
  totals: { visitors: number; pageviews: number; plays: number; minutes: number; radioPlays: number; signups: number; activeUsers: number; searches: number };
  previous: { visitors: number; pageviews: number; plays: number; minutes: number; signups: number; activeUsers: number };
  accounts: { total: number; active7: number; active30: number };
  pages: Row[]; sources: Row[]; languages: Row[]; devices: Row[];
  tracks: Row[]; composers: Row[]; searches: Row[]; emptySearches: Row[];
};

const RANGES = [7, 30, 90] as const;
const LANGUAGE: Record<string, string> = { zh: "中文", en: "English", unknown: "Unknown" };
const DEVICE: Record<string, string> = { mobile: "Phone", tablet: "Tablet", desktop: "Computer", unknown: "Unknown" };
const fmt = (value: number) => Number(value).toLocaleString("en");
const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

export default function StatsPanel() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin?view=stats&days=${days}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Statistics are unavailable.");
        setStats(data);
        setError("");
      })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Statistics are unavailable."); });
    return () => controller.abort();
  }, [days]);

  return (
    <div className="grid gap-10">
      {/* Filters live in one row above every chart. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          Counted without cookies or IP addresses. Editors&apos; own browsing and visitors with Do Not Track are left out. Days follow Sydney time.
        </p>
        <div role="radiogroup" aria-label="Time range" className="flex rounded-full border border-line bg-card p-1">
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              role="radio"
              aria-checked={days === range}
              onClick={() => setDays(range)}
              className={`h-8 rounded-full px-4 text-xs font-semibold transition ${days === range ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
            >
              {range} days
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">{error}</p>}
      {!stats && !error && <div className="grid h-60 place-items-center"><LoaderCircle className="size-6 animate-spin text-muted" /></div>}

      {stats && (
        <>
          <section aria-label="Headline numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Unique visitors" value={stats.totals.visitors} previous={stats.previous.visitors} days={stats.days} hint="Counted once per person per day, summed" />
            <Tile label="Plays" value={stats.totals.plays} previous={stats.previous.plays} days={stats.days} hint={`${fmt(stats.totals.radioPlays)} started by radio`} />
            <Tile label="Minutes listened" value={stats.totals.minutes} previous={stats.previous.minutes} days={stats.days} />
            <Tile label="New sign-ups" value={stats.totals.signups} previous={stats.previous.signups} days={stats.days} hint={`${fmt(stats.accounts.total)} accounts in total`} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <DailyBars title="Visitors per day" unit="visitors" data={stats.daily.map((day) => ({ day: day.day, value: Number(day.visitors), extra: `${fmt(day.pageviews)} page views` }))} />
            <DailyBars title="Plays per day" unit="plays" data={stats.daily.map((day) => ({ day: day.day, value: Number(day.plays), extra: `${fmt(day.minutes)} minutes listened` }))} />
          </section>

          <section aria-label="Accounts" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Plain label="Accounts" value={stats.accounts.total} />
            <Plain label="Active in last 7 days" value={stats.accounts.active7} />
            <Plain label="Active in last 30 days" value={stats.accounts.active30} />
            <Plain label={`Sign-ins (${stats.days} days)`} value={stats.daily.reduce((sum, day) => sum + Number(day.logins), 0)} />
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <RankList title="Where visitors come from" unit="visitors" rows={stats.sources} empty="No visits recorded yet." />
            <RankList title="Language" unit="visitors" rows={stats.languages.map((row) => ({ ...row, label: LANGUAGE[row.label] ?? row.label }))} empty="No visits recorded yet." />
            <RankList title="Device" unit="visitors" rows={stats.devices.map((row) => ({ ...row, label: DEVICE[row.label] ?? row.label }))} empty="No visits recorded yet." />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <RankList title="Most played recordings" unit="plays" rows={stats.tracks} empty="No plays yet." link={(row) => (row as Row & { id?: string }).id ? `/track/${(row as Row & { id?: string }).id}` : undefined} />
            <RankList title="Most played composers" unit="plays" rows={stats.composers.map((row) => ({ ...row, label: COMPOSER_BY_SLUG.get(row.label)?.name ?? row.label }))} empty="No plays yet." />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <RankList title="Most visited pages" unit="views" rows={stats.pages} empty="No page views yet." />
            <RankList title="Top searches" unit="searches" rows={stats.searches.map((row) => ({ ...row, detail: `~${row.results ?? 0} results` }))} empty="No searches yet." />
          </section>

          <section className="rounded-2xl border border-line bg-card p-5">
            <h3 className="font-serif text-2xl">Searches with no results</h3>
            <p className="mt-1 text-sm text-muted">What listeners looked for and didn&apos;t find. Good candidates for new composers or for fixing titles.</p>
            {stats.emptySearches.length ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {stats.emptySearches.map((row) => (
                  <li key={row.label} className="rounded-full border border-line px-3 py-1.5 text-sm">
                    {row.label} <span className="text-xs text-muted">×{fmt(row.value)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-4 text-sm text-muted">None — every search found something.</p>}
          </section>
        </>
      )}
    </div>
  );
}

/** Headline number with change versus the previous period of the same length. */
function Tile({ label, value, previous, days, hint }: { label: string; value: number; previous: number; days: number; hint?: string }) {
  const current = Number(value);
  const before = Number(previous);
  const change = before > 0 ? Math.round(((current - before) / before) * 100) : null;
  const Icon = change === null || change === 0 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-serif text-4xl tabular-nums">{fmt(current)}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-ink-2">
        <Icon className="size-3.5" aria-hidden />
        {change === null ? `none in the previous ${days} days` : `${change > 0 ? "+" : ""}${change}% vs previous ${days} days`}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Plain({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="font-serif text-3xl tabular-nums">{fmt(Number(value))}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

/** Single-series daily bars: thin marks, 2px gaps, rounded data ends, hover/focus tooltip, table view. */
function DailyBars({ title, unit, data }: { title: string; unit: string; data: { day: string; value: number; extra: string }[] }) {
  const max = Math.max(1, ...data.map((point) => point.value));
  const ticks = [max, Math.round(max / 2), 0];
  const labelEvery = Math.ceil(data.length / 6);
  const total = data.reduce((sum, point) => sum + point.value, 0);
  return (
    <figure className="rounded-2xl border border-line bg-card p-5">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-serif text-2xl">{title}</span>
        <span className="text-xs text-muted">{fmt(total)} {unit}</span>
      </figcaption>
      <div className="mt-4 grid grid-cols-[2.5rem_1fr] gap-2">
        <div className="flex h-44 flex-col justify-between text-right text-[10px] tabular-nums text-muted" aria-hidden>
          {ticks.map((tick, index) => <span key={index}>{fmt(tick)}</span>)}
        </div>
        <div className="relative h-44" role="img" aria-label={`${title}: ${data.map((point) => `${shortDate(point.day)} ${point.value}`).join(", ")}`}>
          {/* Recessive grid: three hairlines. */}
          {[0, 50, 100].map((top) => <div key={top} className="absolute inset-x-0 border-t border-line" style={{ top: `${top}%` }} aria-hidden />)}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((point) => (
              <div key={point.day} tabIndex={0} className="group relative flex h-full flex-1 items-end outline-none" aria-label={`${shortDate(point.day)}: ${fmt(point.value)} ${unit}`}>
                <div
                  className="w-full rounded-t-[4px] bg-chart transition-opacity group-hover:opacity-80"
                  style={{ height: point.value ? `max(${(point.value / max) * 100}%, 2px)` : 0 }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max -translate-x-1/2 rounded-lg border border-line bg-paper px-3 py-2 text-xs shadow-lg group-hover:block group-focus:block">
                  <p className="font-semibold text-ink">{shortDate(point.day)}</p>
                  <p className="text-ink-2">{fmt(point.value)} {unit}</p>
                  <p className="text-muted">{point.extra}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <span />
        <div className="flex text-[10px] text-muted" aria-hidden>
          {data.map((point, index) => (
            <span key={point.day} className="flex-1 text-center">{index % labelEvery === 0 ? shortDate(point.day) : ""}</span>
          ))}
        </div>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted hover:text-ink">Show as table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-muted"><tr><th className="py-1 font-medium">Day</th><th className="font-medium">{unit}</th><th className="font-medium">Details</th></tr></thead>
          <tbody>{data.map((point) => <tr key={point.day} className="border-t border-line"><td className="py-1">{shortDate(point.day)}</td><td>{fmt(point.value)}</td><td className="text-muted">{point.extra}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

/** Ranked horizontal bars; the label and value are text, the bar only shows proportion. */
function RankList({ title, unit, rows, empty, link }: { title: string; unit: string; rows: Row[]; empty: string; link?: (row: Row) => string | undefined }) {
  const max = Math.max(1, ...rows.map((row) => Number(row.value)));
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h3 className="font-serif text-2xl">{title}</h3>
      {rows.length === 0 ? <p className="mt-4 text-sm text-muted">{empty}</p> : (
        <ol className="mt-4 grid gap-[2px]">
          {rows.map((row) => {
            const href = link?.(row);
            const content = (
              <>
                <span className="absolute inset-y-0 left-0 rounded-r-[4px] bg-chart/20" style={{ width: `${(Number(row.value) / max) * 100}%` }} aria-hidden />
                <span className="relative min-w-0 flex-1 truncate">{row.label}{row.detail && <span className="ml-2 text-xs text-muted">{row.detail}</span>}</span>
                <span className="relative shrink-0 tabular-nums text-ink-2">{fmt(Number(row.value))}</span>
              </>
            );
            return (
              <li key={`${row.label}-${row.detail ?? ""}`} title={`${row.label}: ${fmt(Number(row.value))} ${unit}`}>
                {href
                  ? <a href={href} target="_blank" rel="noreferrer" className="relative flex items-center gap-3 overflow-hidden rounded-md px-2 py-1.5 text-sm hover:underline">{content}</a>
                  : <div className="relative flex items-center gap-3 overflow-hidden rounded-md px-2 py-1.5 text-sm">{content}</div>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
