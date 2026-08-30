"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, User, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarBadge } from "@/components/ui/avatar";

export default function ProfileMenu() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((session) => {
        setSignedIn(Boolean(session.user));
        if (session.user) {
          return fetch("/api/admin", {
            cache: "no-store",
            signal: controller.signal,
          });
        }
        return null;
      })
      .then((response) => {
        if (response?.ok) setIsAdmin(true);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Your account menu"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#a74735] focus-visible:ring-offset-2"
      >
        <Avatar className="ring-2 ring-white" size="default">
          <AvatarFallback className="bg-[#d8b36e] text-[10px] font-bold text-[#342824]">
            YO
          </AvatarFallback>
          {signedIn && <AvatarBadge className="bg-emerald-500" />}
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          inset={false}
          onClick={() => router.push("/settings/profile")}
        >
          <UserRound className="size-4" />
          Update profile details
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            inset={false}
            onClick={() => router.push("/admin")}
          >
            <ShieldCheck className="size-4 text-[var(--theme-accent)]" />
            Admin page
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="" />
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          inset={false}
          onClick={() => router.push("/account")}
        >
          <User className="size-4" />
          Manage profile
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
