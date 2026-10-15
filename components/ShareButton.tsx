"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

type Props = {
  /** Site-relative path to share, e.g. `/track/…`. */
  path: string;
  title: string;
  text?: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
};

export default function ShareButton({ path, title, text, label = "Share", className = "", iconOnly = false }: Props) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if ((error as DOMException).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link", url);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const Icon = copied ? Check : Share2;
  return (
    <button
      type="button"
      onClick={share}
      aria-label={iconOnly ? `${label}: ${title}` : undefined}
      title={iconOnly ? (copied ? "Link copied" : label) : undefined}
      className={className}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {!iconOnly && <span>{copied ? "Link copied" : label}</span>}
      <span className="sr-only" aria-live="polite">{copied ? "Link copied to clipboard" : ""}</span>
    </button>
  );
}
