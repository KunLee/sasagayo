"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
export default function PresenceTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const heartbeat = () => {
      if (document.visibilityState === "visible")
        void fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: pathname }),
          keepalive: true,
        });
    };
    heartbeat();
    const timer = window.setInterval(heartbeat, 45000);
    document.addEventListener("visibilitychange", heartbeat);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", heartbeat);
    };
  }, [pathname]);
  return null;
}
