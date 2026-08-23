"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

export default function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  function submit(event: FormEvent) { event.preventDefault(); if (!query.trim()) return; setOpen(false); router.push(`/search?q=${encodeURIComponent(query.trim())}`); }
  return <><button onClick={() => setOpen(true)} className="ml-auto hidden w-full max-w-72 items-center rounded-full border border-stone-900/10 bg-white/55 px-4 md:flex"><Search className="size-4 text-stone-500"/><span className="h-10 flex-1 px-3 text-left text-xs leading-10 text-stone-400">Search songs, stories, people</span><kbd className="rounded border border-stone-900/10 bg-white px-1.5 py-0.5 text-[9px] text-stone-400">⌘K</kbd></button>{open && <div className="fixed inset-0 z-[100] bg-[#21191d]/55 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}><div className="mx-auto mt-[12vh] max-w-2xl overflow-hidden rounded-[28px] bg-[#fffaf2] shadow-2xl" onMouseDown={event => event.stopPropagation()}><form onSubmit={submit} className="flex items-center border-b border-stone-900/8 p-5"><Search className="size-5 text-[#a74735]"/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} className="h-11 flex-1 bg-transparent px-4 text-lg outline-none placeholder:text-stone-400" placeholder="What do you feel like hearing?"/><button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full hover:bg-stone-900/5" aria-label="Close search"><X className="size-4"/></button></form><div className="p-5"><p className="micro-label text-stone-400">Try a feeling, moment, or artist</p><div className="mt-4 flex flex-wrap gap-2">{["slow mornings","starting over","Nina Simone","night drives","piano"].map(term => <button key={term} onClick={() => { setOpen(false); router.push(`/search?q=${encodeURIComponent(term)}`); }} className="rounded-full border border-stone-900/10 px-3 py-2 text-xs hover:bg-white">{term}</button>)}</div></div></div></div>}</>;
}
