"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/SessionProvider";

export default function AccountMenu() {
  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (session.loading) return <span className="size-10 shrink-0" aria-hidden />;
  if (!session.account) {
    return (
      <Link href={`/signin?next=${encodeURIComponent(pathname)}`} className="flex h-10 shrink-0 items-center rounded-full px-3 text-sm font-medium text-ink-2 hover:text-accent">
        Sign in
      </Link>
    );
  }

  const { account } = session;
  const initials = account.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "♪";
  const item = "block rounded-lg px-3 py-2 text-sm hover:bg-paper-2";
  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${account.displayName}`}
        className="grid size-10 place-items-center rounded-full bg-ink font-serif text-sm font-semibold text-paper transition hover:bg-accent hover:text-accent-ink"
      >
        {initials}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-line bg-card p-2 shadow-2xl" onClick={() => setOpen(false)}>
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{account.displayName}</p>
            <p className="truncate text-xs text-muted">{account.email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link role="menuitem" href="/library" className={item}>My library</Link>
          <Link role="menuitem" href="/account" className={item}>Account</Link>
          {session.isEditor && <Link role="menuitem" href="/admin" className={`${item} text-accent`}>Editor desk</Link>}
          <div className="my-1 h-px bg-line" />
          <button role="menuitem" type="button" onClick={async () => { await session.signOut(); router.refresh(); }} className={`${item} w-full text-left text-muted`}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
