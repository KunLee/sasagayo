"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminNavLink() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (response.ok) setAllowed(true);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  if (!allowed) return null;
  return (
    <Link
      href="/admin"
      className="icon-button hidden sm:grid"
      aria-label="Administration"
      title="Administration"
    >
      <ShieldCheck className="size-4 text-[var(--theme-accent)]" />
    </Link>
  );
}
