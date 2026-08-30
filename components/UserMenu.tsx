"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Settings, ShieldCheck, UserRound, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarBadge } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialsFromEmail(email?: string | null) {
  if (!email) return "YO";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return "YO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function UserMenu() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initials, setInitials] = useState("YO");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((session) => {
        setSignedIn(Boolean(session.user));
        setInitials(initialsFromEmail(session.user?.email));
        if (session.user) {
          fetch("/api/admin", {
            cache: "no-store",
            signal: controller.signal,
          })
            .then((response) => setIsAdmin(response.ok))
            .catch(() => setIsAdmin(false));
        } else {
          setIsAdmin(false);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Your account"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#a74735]/40"
      >
        <Avatar className="ring-2 ring-white" size="default">
          <AvatarFallback className="bg-[#d8b36e] text-[10px] font-bold text-[#342824]">
            {initials}
          </AvatarFallback>
          {signedIn && <AvatarBadge className="bg-emerald-500" />}
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Your account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
          <UserRound className="size-4" />
          Update Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
          <Settings className="size-4" />
          Manage profile
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => router.push("/admin")}>
            <ShieldCheck className="size-4" />
            Admin
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/account")}>
          <Wallet className="size-4" />
          Account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
