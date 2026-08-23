import Link from "next/link";
import { ArrowUpRight, Heart, MessageCircle, Music2 } from "lucide-react";
import type { Story } from "@/lib/community";

export default function StoryCard({ story, featured = false }: { story: Story; featured?: boolean }) {
  return <article className={`group flex h-full flex-col rounded-[28px] border border-stone-900/8 bg-white/55 p-6 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-stone-900/6 ${featured ? "sm:p-8" : ""}`}>
    <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full text-[10px] font-bold text-white" style={{backgroundColor:story.color}}>{story.initials}</span><div><Link href={`/profile/${story.handle}`} className="text-xs font-semibold hover:text-[#a74735]">{story.author}</Link><p className="mt-0.5 text-[9px] text-stone-400">{story.location} · {story.time}</p></div></div><span className="micro-label text-[#a74735]">{story.category}</span></div>
    <Link href={`/stories/${story.slug}`} className="mt-7 block"><h2 className={`font-serif leading-[1.02] tracking-[-.025em] transition group-hover:text-[#a74735] ${featured ? "text-4xl" : "text-2xl"}`}>{story.title}</h2><p className="mt-4 text-sm leading-7 text-stone-600">{story.excerpt}</p></Link>
    <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[#eee5d8] p-3"><span className="grid size-9 place-items-center rounded-full bg-[#2b2025] text-white"><Music2 className="size-3.5" /></span><div className="min-w-0"><p className="truncate text-xs font-semibold">{story.track}</p><p className="text-[10px] text-stone-500">{story.artist} · {story.mood}</p></div></div>
    <div className="mt-auto flex items-center gap-5 pt-6 text-[11px] text-stone-400"><span className="inline-flex items-center gap-1.5"><Heart className="size-3.5" />{story.reactions}</span><span className="inline-flex items-center gap-1.5"><MessageCircle className="size-3.5" />{story.comments}</span><Link href={`/stories/${story.slug}`} className="ml-auto inline-flex items-center gap-1 font-semibold text-stone-600 group-hover:text-[#a74735]">Read story <ArrowUpRight className="size-3.5" /></Link></div>
  </article>;
}

