"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import { useI18n } from "@/components/I18nProvider";
import { useSession } from "@/components/SessionProvider";

export default function AccountMenu() {
  const session = useSession();
  const { t } = useI18n();
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
        {t.nav.signIn}
      </Link>
    );
  }

  const { account } = session;
  const item = "block rounded-lg px-3 py-2 text-sm hover:bg-paper-2";
  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t.nav.accountMenu(account.displayName)}
        className="rounded-full ring-offset-2 ring-offset-paper transition hover:ring-2 hover:ring-accent"
      >
        <Avatar name={account.displayName} url={account.avatarUrl} size={40} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-line bg-card p-2 shadow-2xl" onClick={() => setOpen(false)}>
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{account.displayName}</p>
            <p className="truncate text-xs text-muted">{account.email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link role="menuitem" href={`/u/${account.handle}`} className={item}>{t.profile.myProfile}</Link>
          <Link role="menuitem" href="/library" className={item}>{t.nav.library}</Link>
          <Link role="menuitem" href="/account" className={item}>{t.nav.account}</Link>
          {session.isEditor && <Link role="menuitem" href="/admin" className={`${item} text-accent`}>{t.nav.editor}</Link>}
          <div className="my-1 h-px bg-line" />
          <button role="menuitem" type="button" onClick={async () => { await session.signOut(); router.refresh(); }} className={`${item} w-full text-left text-muted`}>
            {t.nav.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
