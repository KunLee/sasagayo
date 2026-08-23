"use client";

import { Check, Palette, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const themes = [
  {
    id: "ember",
    name: "Ember",
    note: "Warm and editorial",
    colors: ["#a74735", "#2b2025", "#f7f4ee"],
  },
  {
    id: "violet",
    name: "Violet",
    note: "Creative and expressive",
    colors: ["#7650a4", "#282132", "#f5f0f8"],
  },
  {
    id: "ocean",
    name: "Ocean",
    note: "Clear and contemplative",
    colors: ["#28768e", "#172d35", "#edf5f6"],
  },
  {
    id: "midnight",
    name: "Midnight",
    note: "Low-light listening",
    colors: ["#d27b68", "#f4eee8", "#121318"],
  },
  {
    id: "paper",
    name: "Paper",
    note: "Quiet and minimal",
    colors: ["#303030", "#111111", "#ffffff"],
  },
] as const;
type Theme = (typeof themes)[number]["id"];

export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("ember");
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = document.documentElement.dataset.theme as
        Theme | undefined;
      if (current && themes.some((item) => item.id === current))
        setTheme(current);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!panel.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  function choose(next: Theme) {
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("sasagayo-theme", next);
    setTheme(next);
  }
  return (
    <div className="relative" ref={panel}>
      <button
        onClick={() => setOpen(!open)}
        className="icon-button grid"
        aria-label="Choose color theme"
        aria-expanded={open}
      >
        <Palette className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-[90] w-[290px] rounded-[24px] border border-stone-900/10 bg-[var(--theme-surface)] p-3 shadow-2xl shadow-stone-900/15">
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <div>
              <p className="micro-label text-[var(--theme-accent)]">
                Appearance
              </p>
              <p className="mt-1 font-serif text-xl">Choose your atmosphere</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="grid size-8 place-items-center rounded-full hover:bg-stone-900/5"
              aria-label="Close theme picker"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-2 grid gap-1">
            {themes.map((item) => (
              <button
                key={item.id}
                onClick={() => choose(item.id)}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-stone-900/5 ${theme === item.id ? "bg-stone-900/5" : ""}`}
              >
                <span className="flex -space-x-2">
                  {item.colors.map((color) => (
                    <span
                      key={color}
                      className="size-7 rounded-full border-2 border-[var(--theme-surface)]"
                      style={{ background: color }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-xs">{item.name}</strong>
                  <span className="text-[10px] text-stone-500">
                    {item.note}
                  </span>
                </span>
                {theme === item.id && (
                  <Check className="size-4 text-[var(--theme-accent)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
