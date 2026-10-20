"use client";

import { LoaderCircle, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { adminPost } from "./types";

type User = {
  id: string; email: string; handle: string; display_name: string; account_status: "active" | "suspended";
  role: "admin" | "moderator" | "member"; library_size: number; created_at: string; last_sign_in_at: string | null;
};

export default function UsersPanel() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [me, setMe] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin?view=users&q=${encodeURIComponent(query)}`, { cache: "no-store", signal });
      const data = await response.json();
      if (response.ok) { setUsers(data.users ?? []); setMe(data.me); } else setNotice(data.error ?? "Users could not be loaded.");
    } catch {
      // Superseded by a newer search.
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), query ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load, query]);

  async function change(user: User, body: Record<string, unknown>, summary: string) {
    const reason = window.prompt(`${summary}\n\nReason for the audit log:`, "");
    if (reason === null) return;
    try {
      await adminPost({ ...body, userId: user.id, reason });
      setNotice(`${user.display_name}: ${summary.toLowerCase()}.`);
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
    }
  }

  const editors = users.filter((user) => user.role === "admin").length;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-10 min-w-64 flex-1 items-center gap-2 rounded-full border border-line bg-card px-4">
          <Search className="size-4 text-muted" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" className="flex-1 bg-transparent text-sm outline-none" aria-label="Search users" />
        </label>
        <span className="text-sm text-muted">{users.length} accounts · {editors} editor{editors === 1 ? "" : "s"}</span>
        {loading && <LoaderCircle className="size-4 animate-spin text-muted" />}
      </div>
      {notice && <p role="status" className="mt-4 rounded-xl border border-line bg-card px-4 py-3 text-sm">{notice}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr><th className="py-2 font-medium">Listener</th><th className="font-medium">Joined</th><th className="font-medium">Last sign-in</th><th className="font-medium">Library</th><th className="font-medium">Role</th><th className="font-medium">Status</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((user) => {
              const self = user.id === me;
              return (
                <tr key={user.id} className={user.account_status === "suspended" ? "text-muted" : ""}>
                  <td className="py-3"><a href={`/u/${user.handle}`} target="_blank" rel="noreferrer" className="block font-medium hover:text-accent hover:underline">{user.display_name}{self && <span className="ml-2 text-xs text-muted">(you)</span>}</a><span className="text-xs text-muted">@{user.handle} · {user.email}</span></td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "—"}</td>
                  <td className="tabular-nums">{user.library_size}</td>
                  <td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${user.role === "admin" ? "bg-accent text-accent-ink" : "bg-paper-2 text-muted"}`}>{user.role === "admin" ? "Editor" : "Listener"}</span></td>
                  <td>{user.account_status === "active" ? "Active" : "Suspended"}</td>
                  <td className="whitespace-nowrap py-3 text-right">
                    {!self && (
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => change(user, { action: "set-role", role: user.role === "admin" ? "member" : "admin" }, user.role === "admin" ? "Remove editor access" : "Make editor")} className="h-8 rounded-full border border-line px-3 text-xs font-semibold hover:border-accent hover:text-accent">
                          {user.role === "admin" ? "Remove editor" : "Make editor"}
                        </button>
                        <button type="button" onClick={() => change(user, { action: "set-user-status", status: user.account_status === "active" ? "suspended" : "active" }, user.account_status === "active" ? "Suspend account" : "Reactivate account")} className="h-8 rounded-full border border-line px-3 text-xs font-semibold hover:border-accent hover:text-accent">
                          {user.account_status === "active" ? "Suspend" : "Reactivate"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
