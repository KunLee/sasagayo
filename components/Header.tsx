import Link from 'next/link';
import { Bell, Compass, Menu, Plus, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarBadge } from '@/components/ui/avatar';

export default function Header() {
  return <header className="sticky top-0 z-50 border-b border-stone-900/8 bg-[#f7f4ee]/88 backdrop-blur-xl">
    <div className="mx-auto flex h-18 max-w-[1400px] items-center gap-8 px-5 sm:px-8">
      <Link href="/" className="flex items-center gap-2.5" aria-label="Sasagayo home"><span className="grid size-8 place-items-center rounded-full bg-[#2b2025] font-serif text-lg italic text-white">S</span><span className="font-serif text-[22px] tracking-[-.03em]">sasagayo</span></Link>
      <nav className="hidden items-center gap-1 rounded-full bg-stone-900/4 p-1 lg:flex" aria-label="Main navigation"><Link className="nav-pill nav-pill-active" href="/"><Compass className="size-3.5"/>Discover</Link><Link className="nav-pill" href="#stories">Stories</Link><Link className="nav-pill" href="#circles">Circles</Link></nav>
      <div className="ml-auto hidden w-full max-w-72 items-center rounded-full border border-stone-900/10 bg-white/55 px-4 md:flex"><Search className="size-4 text-stone-500"/><input className="h-10 w-full bg-transparent px-3 text-xs outline-none placeholder:text-stone-400" placeholder="Search songs, stories, people" aria-label="Search"/><kbd className="rounded border border-stone-900/10 bg-white px-1.5 py-0.5 text-[9px] text-stone-400">⌘K</kbd></div>
      <div className="flex items-center gap-2"><button className="icon-button hidden sm:grid" aria-label="Notifications"><Bell className="size-4"/></button><Link href="#share" className="hidden h-10 items-center gap-2 rounded-full bg-[#a74735] px-4 text-xs font-semibold text-white shadow-sm hover:-translate-y-0.5 hover:bg-[#923a2b] sm:flex"><Plus className="size-4"/>Share</Link><Avatar className="ring-2 ring-white" size="default"><AvatarFallback className="bg-[#d8b36e] text-[10px] font-bold text-[#342824]">YO</AvatarFallback><AvatarBadge className="bg-emerald-500"/></Avatar><button className="icon-button grid lg:hidden" aria-label="Open menu"><Menu className="size-4"/></button></div>
    </div>
  </header>;
}
