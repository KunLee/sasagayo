"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  Check,
  ChevronRight,
  CircleGauge,
  FileWarning,
  LoaderCircle,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

type Overview = {
  members: number;
  activeMembers: number;
  suspendedMembers: number;
  admins: number;
  openReports: number;
  stories: number;
  activeNow: number;
  loginsToday: number;
  activePaths: { path: string; visitors: number }[];
};
type UserRow = {
  id: string;
  email: string;
  handle: string;
  display_name: string;
  account_status: string;
  reputation_points: number;
  reputation_title: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
};
type ActivityRow = {
  id: number;
  event_type: string;
  email: string;
  display_name: string;
  created_at: string;
};
type ReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  reporter: string;
  created_at: string;
};
type AuditRow = {
  id: number;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
};
type Tab = "overview" | "users" | "activity" | "reports" | "audit";

const tabs = [
  { id: "overview", label: "Overview", icon: CircleGauge },
  { id: "users", label: "Users", icon: Users },
  { id: "activity", label: "Logins", icon: Activity },
  { id: "reports", label: "Moderation", icon: FileWarning },
  { id: "audit", label: "Audit log", icon: BookOpen },
] as const;

export default function AdminClient() {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [items, setItems] = useState<unknown[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "error">(
    "loading",
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [message, setMessage] = useState("");
  const load = useCallback(
    async (current: Tab = tab, q = query) => {
      const suffix =
        current === "overview"
          ? ""
          : `?view=${current}${current === "users" && q ? `&q=${encodeURIComponent(q)}` : ""}`;
      const response = await fetch(`/api/admin${suffix}`, {
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403)
        return setState("denied");
      if (!response.ok) return setState("error");
      const data = await response.json();
      if (current === "overview") setOverview(data.overview);
      else setItems(data.items ?? []);
      setState("ready");
    },
    [tab, query],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => void load(tab, query), 0);
    return () => window.clearTimeout(timer);
  }, [tab, load, query]);
  async function act(payload: Record<string, unknown>) {
    setMessage("");
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setMessage(
      response.ok
        ? "Change saved and added to the audit log."
        : (data.error ?? "Change failed."),
    );
    if (response.ok) {
      setSelected(null);
      load(tab, query);
    }
  }
  if (state === "denied")
    return (
      <main className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-6 text-center">
        <div>
          <ShieldCheck className="mx-auto size-10 text-[#a74735]" />
          <h1 className="mt-6 font-serif text-5xl">A private room.</h1>
          <p className="mt-5 text-sm leading-7 text-stone-600">
            This area requires an administrator role. Signing in alone does not
            grant access.
          </p>
          <Link
            href="/account"
            className="mt-7 inline-flex h-11 items-center rounded-full bg-[#2b2025] px-6 text-xs font-semibold text-white"
          >
            Go to your account
          </Link>
        </div>
      </main>
    );
  return (
    <main className="min-h-[75vh] bg-[#eee9df]">
      <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-[#a74735]">
              <ShieldCheck className="size-4" />
              <p className="micro-label">Administration</p>
            </div>
            <h1 className="mt-3 font-serif text-5xl tracking-[-.04em]">
              Community stewardship
            </h1>
          </div>
          <span className="rounded-full border border-stone-900/10 bg-white/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-[.12em]">
            Server protected
          </span>
        </header>
        <div className="mt-9 grid gap-6 lg:grid-cols-[220px_1fr]">
          <nav className="h-fit rounded-[24px] border border-stone-900/8 bg-[#2b2025] p-2 text-white">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setState("loading");
                  setTab(id);
                  setItems([]);
                }}
                className={`flex w-full items-center gap-3 rounded-[17px] px-4 py-3 text-left text-sm transition ${tab === id ? "bg-white text-stone-900" : "text-stone-400 hover:bg-white/5 hover:text-white"}`}
              >
                <Icon className="size-4" />
                {label}
                <ChevronRight className="ml-auto size-3" />
              </button>
            ))}
          </nav>
          <section className="min-w-0 rounded-[30px] border border-stone-900/8 bg-[#faf7f1] p-5 shadow-sm sm:p-8">
            {state === "loading" && (
              <div className="grid min-h-80 place-items-center">
                <LoaderCircle className="size-7 animate-spin text-[#a74735]" />
              </div>
            )}
            {state === "error" && (
              <p className="p-8 text-sm text-red-700">
                Administration data could not be loaded.
              </p>
            )}
            {state === "ready" && tab === "overview" && overview && (
              <OverviewView data={overview} />
            )}
            {state === "ready" && tab === "users" && (
              <UsersView
                users={items as UserRow[]}
                query={query}
                setQuery={(value) => {
                  setState("loading");
                  setQuery(value);
                }}
                select={setSelected}
              />
            )}
            {state === "ready" && tab === "activity" && (
              <ActivityView items={items as ActivityRow[]} />
            )}
            {state === "ready" && tab === "reports" && (
              <ReportsView items={items as ReportRow[]} act={act} />
            )}
            {state === "ready" && tab === "audit" && (
              <AuditView items={items as AuditRow[]} />
            )}
          </section>
        </div>
        {message && (
          <p
            role="status"
            className="fixed bottom-6 right-6 rounded-2xl bg-[#2b2025] px-5 py-4 text-xs text-white shadow-xl"
          >
            {message}
          </p>
        )}
      </div>
      {selected && (
        <UserDrawer user={selected} close={() => setSelected(null)} act={act} />
      )}
    </main>
  );
}

function OverviewView({ data }: { data: Overview }) {
  const cards = [
    ["Members", data.members],
    ["Active accounts", data.activeMembers],
    ["Suspended", data.suspendedMembers],
    ["Administrators", data.admins],
    ["Open reports", data.openReports],
    ["Published stories", data.stories],
    ["Visiting now", data.activeNow],
    ["Logins today", data.loginsToday],
  ];
  return (
    <>
      <h2 className="font-serif text-3xl">Operational overview</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-stone-900/8 bg-white p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[.13em] text-stone-400">
              {label}
            </p>
            <p className="mt-4 font-serif text-4xl">{value}</p>
          </div>
        ))}
      </div>
      <h3 className="mt-10 font-serif text-2xl">Live paths</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {data.activePaths.length ? (
          data.activePaths.map((path) => (
            <div
              key={path.path}
              className="flex justify-between rounded-xl bg-stone-900/4 px-4 py-3 text-sm"
            >
              <span>{path.path}</span>
              <strong>{path.visitors}</strong>
            </div>
          ))
        ) : (
          <p className="text-sm text-stone-500">
            No visitors active in the last two minutes.
          </p>
        )}
      </div>
    </>
  );
}
function UsersView({
  users,
  query,
  setQuery,
  select,
}: {
  users: UserRow[];
  query: string;
  setQuery: (s: string) => void;
  select: (u: UserRow) => void;
}) {
  const [draft, setDraft] = useState(query);
  function submit(e: FormEvent) {
    e.preventDefault();
    setQuery(draft);
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl">Members</h2>
        <form
          onSubmit={submit}
          className="flex h-10 items-center rounded-full border border-stone-900/10 bg-white px-4"
        >
          <Search className="size-4 text-stone-400" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Name, handle, or email"
            className="w-52 bg-transparent px-3 text-xs outline-none"
          />
        </form>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="border-b border-stone-900/8 text-[10px] uppercase tracking-[.12em] text-stone-400">
            <tr>
              <th className="py-3">Member</th>
              <th>Status</th>
              <th>Role</th>
              <th>Reputation</th>
              <th>Last login</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-stone-900/6">
                <td className="py-4">
                  <strong className="block text-sm">{user.display_name}</strong>
                  <span className="text-stone-400">
                    {user.email} · @{user.handle}
                  </span>
                </td>
                <td>
                  <Badge>{user.account_status}</Badge>
                </td>
                <td>{user.role}</td>
                <td>
                  {user.reputation_points} · {user.reputation_title}
                </td>
                <td>
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleString()
                    : "Never"}
                </td>
                <td>
                  <button
                    onClick={() => select(user)}
                    className="rounded-full border px-3 py-2 font-semibold"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && (
          <p className="py-10 text-center text-stone-500">No members found.</p>
        )}
      </div>
    </>
  );
}
function ActivityView({ items }: { items: ActivityRow[] }) {
  return (
    <>
      <h2 className="font-serif text-3xl">Successful logins</h2>
      <p className="mt-2 text-xs text-stone-500">
        Application sign-ins only; session refreshes are excluded.
      </p>
      <div className="mt-6 grid gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap justify-between gap-2 rounded-xl border border-stone-900/7 bg-white p-4 text-xs"
          >
            <span>
              <strong>{item.display_name}</strong> · {item.email}
            </span>
            <time className="text-stone-400">
              {new Date(item.created_at).toLocaleString()}
            </time>
          </div>
        ))}
      </div>
    </>
  );
}
function ReportsView({
  items,
  act,
}: {
  items: ReportRow[];
  act: (p: Record<string, unknown>) => void;
}) {
  return (
    <>
      <h2 className="font-serif text-3xl">Moderation queue</h2>
      <div className="mt-6 grid gap-3">
        {items.length ? (
          items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-stone-900/8 bg-white p-5"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <Badge>{item.status}</Badge>
                  <p className="mt-3 text-sm font-semibold">
                    {item.target_type} reported by {item.reporter}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-stone-500">
                    {item.reason}
                  </p>
                </div>
                {item.status === "open" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        act({
                          action: "resolve-report",
                          reportId: item.id,
                          status: "resolved",
                          reason: "Reviewed and actioned by administrator",
                        })
                      }
                      className="icon-button"
                    >
                      <Check className="size-4" />
                    </button>
                    <button
                      onClick={() =>
                        act({
                          action: "resolve-report",
                          reportId: item.id,
                          status: "dismissed",
                          reason: "Reviewed and dismissed by administrator",
                        })
                      }
                      className="icon-button"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-stone-500">
            The moderation queue is clear.
          </p>
        )}
      </div>
    </>
  );
}
function AuditView({ items }: { items: AuditRow[] }) {
  return (
    <>
      <h2 className="font-serif text-3xl">Administrative audit log</h2>
      <div className="mt-6 grid gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-stone-900/7 bg-white p-4 text-xs"
          >
            <div className="flex justify-between gap-4">
              <strong>
                {item.actor} · {item.action.replaceAll("_", " ")}
              </strong>
              <time className="text-stone-400">
                {new Date(item.created_at).toLocaleString()}
              </time>
            </div>
            <p className="mt-2 text-stone-500">
              {item.target_type} {item.target_id} — {item.reason}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-stone-900/6 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em]">
      {children}
    </span>
  );
}
function UserDrawer({
  user,
  close,
  act,
}: {
  user: UserRow;
  close: () => void;
  act: (p: Record<string, unknown>) => void;
}) {
  const [reason, setReason] = useState("");
  const [points, setPoints] = useState(0);
  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-stone-950/30 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <aside className="h-full w-full max-w-md overflow-y-auto bg-[#faf7f1] p-7 shadow-2xl">
        <button onClick={close} className="icon-button ml-auto">
          <X className="size-4" />
        </button>
        <p className="micro-label mt-8 text-[#a74735]">Manage member</p>
        <h2 className="mt-3 font-serif text-4xl">{user.display_name}</h2>
        <p className="mt-2 text-xs text-stone-500">
          {user.email} · @{user.handle}
        </p>
        <label className="mt-8 grid gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-stone-500">
          Required audit reason
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-24 rounded-2xl border bg-white p-4 text-sm font-normal normal-case tracking-normal outline-none"
            placeholder="Explain why this change is needed"
          />
        </label>
        <div className="mt-6 grid gap-3">
          <p className="text-xs font-semibold">Account</p>
          <button
            disabled={reason.trim().length < 5}
            onClick={() =>
              act({
                action: "set-status",
                userId: user.id,
                status:
                  user.account_status === "active" ? "suspended" : "active",
                reason,
              })
            }
            className="h-11 rounded-full bg-[#2b2025] text-xs font-semibold text-white disabled:opacity-30"
          >
            {user.account_status === "active"
              ? "Suspend account"
              : "Restore account"}
          </button>
          <p className="mt-4 text-xs font-semibold">Role</p>
          <div className="grid grid-cols-3 gap-2">
            {["member", "moderator", "admin"].map((role) => (
              <button
                key={role}
                disabled={reason.trim().length < 5 || user.role === role}
                onClick={() =>
                  act({ action: "set-role", userId: user.id, role, reason })
                }
                className="h-10 rounded-full border text-[10px] font-semibold capitalize disabled:opacity-30"
              >
                {role}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold">Reputation adjustment</p>
          <div className="flex gap-2">
            <input
              type="number"
              min="-100"
              max="100"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="h-11 min-w-0 flex-1 rounded-full border bg-white px-4 text-sm outline-none"
            />
            <button
              disabled={
                reason.trim().length < 5 ||
                points === 0 ||
                Math.abs(points) > 100
              }
              onClick={() =>
                act({
                  action: "adjust-reputation",
                  userId: user.id,
                  points,
                  reason,
                })
              }
              className="rounded-full bg-[#a74735] px-5 text-xs font-semibold text-white disabled:opacity-30"
            >
              Apply
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
