"use client";

import { useState } from "react";
import { Heart, Pause, Play } from "lucide-react";
import { recommendations } from "@/lib/community";

export default function RecommendationGrid({ limit }: { limit?: number }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const items = limit ? recommendations.slice(0, limit) : recommendations;
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((track,index) => {
    const active = playing === track.title;
    const liked = saved.includes(track.title);
    return <article key={track.title} className="group"><div className={`relative aspect-[1.2/1] overflow-hidden rounded-[26px] bg-gradient-to-br ${track.color} p-5 shadow-sm`}><span className="text-[9px] font-bold uppercase tracking-[.2em] text-white/60">0{index+1} · For curious ears</span><div className={`absolute -bottom-[35%] -right-[14%] aspect-square w-[84%] rounded-full bg-[#211d1d] shadow-2xl transition duration-700 ${active ? "animate-[spin_8s_linear_infinite]" : "group-hover:rotate-12"}`}><div className="absolute inset-[14%] rounded-full border border-white/8"/><div className="absolute inset-[29%] rounded-full border border-white/8"/><div className="absolute inset-[41%] rounded-full bg-[#d6aa69]"/></div><button onClick={() => setPlaying(active ? null : track.title)} className="absolute bottom-5 left-5 grid size-11 place-items-center rounded-full bg-white text-[#2b2025] shadow-lg transition hover:scale-105" aria-label={`${active ? "Pause" : "Play"} ${track.title}`}>{active ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}</button></div><div className="flex items-start gap-3 px-1 pt-4"><div><p className="micro-label text-[#a74735]">{track.genre}</p><h3 className="mt-2 font-serif text-xl">{track.title}</h3><p className="mt-1 text-xs text-stone-500">{track.artist} · {track.mood}</p></div><button onClick={() => setSaved(current => liked ? current.filter(item => item !== track.title) : [...current, track.title])} className={`ml-auto grid size-9 place-items-center rounded-full transition ${liked ? "bg-[#a74735] text-white" : "bg-white/60 text-stone-400 hover:text-[#a74735]"}`} aria-label={`${liked ? "Unsave" : "Save"} ${track.title}`}><Heart className={`size-4 ${liked ? "fill-current" : ""}`} /></button></div></article>;
  })}</div>;
}

