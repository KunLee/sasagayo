import Link from "next/link";
import { ArrowUpRight, Music2 } from "lucide-react";
const groups = [
  {
    title: "Explore",
    links: [
      ["Discover", "/discover"],
      ["Stories", "/stories"],
      ["Open classical catalog", "/catalog"],
      ["Community pulse", "/insights"],
      ["Listening circles", "/circles"],
      ["Search", "/search"],
    ],
  },
  {
    title: "Create",
    links: [
      ["Share a story", "/compose"],
      ["Your studio", "/studio"],
      ["Your reputation", "/reputation"],
      ["Your account", "/account"],
      ["Contact", "/contact"],
    ],
  },
];
export default function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#21191d] text-stone-300">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-14 sm:px-8 lg:grid-cols-[1.3fr_.7fr_.7fr]">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-3 font-serif text-2xl text-white"
          >
            <span className="grid size-9 place-items-center rounded-full bg-[#a74735]">
              <Music2 className="size-4" />
            </span>
            Sasagayo
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-stone-400">
            A thoughtful corner of the internet for the music we love and the
            stories we carry.
          </p>
          <Link
            href="/compose"
            className="mt-6 inline-flex items-center gap-2 border-b border-stone-600 pb-1 text-sm text-white"
          >
            Share what you&apos;re hearing <ArrowUpRight className="size-3" />
          </Link>
        </div>
        {groups.map((group) => (
          <div key={group.title}>
            <p className="micro-label text-[#cf846f]">{group.title}</p>
            <div className="mt-4 grid gap-2 text-sm">
              {group.links.map(([label, href]) => (
                <Link key={href} href={href} className="hover:text-white">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-[1400px] flex-wrap justify-between gap-4 border-t border-white/8 px-6 py-5 text-[10px] uppercase tracking-[.16em] text-stone-500 sm:px-8">
        <span>© 2026 Sasagayo</span>
        <span>Made for curious ears · privacy by design</span>
      </div>
    </footer>
  );
}
