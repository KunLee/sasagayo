import type { Metadata } from "next";
import Link from "next/link";
import { PUBLISH_AT } from "@/lib/discovery/quality";
import { getI18n } from "@/lib/i18n/server";

const CONTENT = {
  en: {
    title: "About",
    description: "How Sasagayo finds, checks, and credits open classical recordings.",
    eyebrow: "About Sasagayo",
    heading: "Music that belongs to everyone.",
    intro: [
      "Thousands of superb classical recordings are already free — released into the public domain by orchestras and military bands, given away by performers under Creative Commons, or recorded long enough ago that their rights have expired. They are scattered across archives, poorly labelled, and hard to listen to.",
      "Sasagayo gathers them into one calm, searchable library. Every day it works through the archives composer by composer, judges each file, and adds the good ones. You can listen without an account, save favourites, and share a recording — or a whole mix — with a single link.",
    ],
    rulesTitle: "How recordings are chosen",
    rules: [
      ["Real performances only", "MIDI files, synthesised renderings, music-theory examples, and multitrack stems are rejected automatically."],
      ["Whole pieces, not snippets", "Anything under a minute is skipped; full movements and complete works rank higher, and movements are grouped into their works."],
      ["A licence you can rely on", "Only public domain, CC0, CC BY, and CC BY-SA recordings are published. Non-commercial or no-derivatives licences never are."],
      ["Credit where it is due", "Performers are identified from each file's metadata, and every recording carries its attribution and a link to its source."],
      ["Listenable quality", "Low-bitrate copies and degraded derivatives are filtered out; curated collections such as Musopen are favoured."],
      ["A human in the loop", `Recordings scoring ${PUBLISH_AT}+ can go live automatically; editors review the rest and can switch to fully manual publishing.`],
    ],
    sourcesTitle: "Sources",
    sources: "Recordings stream directly from Wikimedia Commons and the Internet Archive's Musopen collection. Composer portraits and biographies come from Wikipedia. Each recording page links to its original file and licence, so you can always verify the rights yourself. If you believe a recording is listed in error, please get in touch and it will be removed promptly.",
    contactTitle: "Contact",
    email: "Email",
    phone: "Phone",
    back: "← Back to listening",
  },
  zh: {
    title: "关于",
    description: "Sasagayo 如何寻找、审核并注明开放许可的古典音乐录音。",
    eyebrow: "关于 Sasagayo",
    heading: "属于每个人的音乐。",
    intro: [
      "成千上万精彩的古典音乐录音其实早已免费——有的由乐团和军乐队捐献给公有领域，有的由演奏家以知识共享协议分享，有的年代久远、版权早已过期。它们散落在各个档案馆里，标注混乱，很难找来听。",
      "Sasagayo 把它们汇集成一座安静、可搜索的音乐馆。它每天按作曲家逐一检索档案馆，评估每一个文件，把好的录音收进来。你无需注册就能收听，可以收藏喜欢的作品，还能用一个链接分享一首录音或整份歌单。",
    ],
    rulesTitle: "我们如何挑选录音",
    rules: [
      ["只收真实演奏", "MIDI 文件、合成音、乐理示例和多轨分轨会被自动排除。"],
      ["完整作品，而非片段", "不足一分钟的文件会被跳过；完整乐章和完整作品排名更高，乐章会按作品自动归组。"],
      ["可靠的许可协议", "只发布公有领域、CC0、CC BY 和 CC BY-SA 的录音，绝不发布非商业或禁止演绎许可的作品。"],
      ["署名清清楚楚", "我们从文件元数据中识别演奏者，每一首录音都附有署名和来源链接。"],
      ["值得一听的音质", "低码率副本和降质衍生文件会被过滤掉，Musopen 等精选合集会被优先收录。"],
      ["人工把关", `评分 ${PUBLISH_AT} 以上的录音可自动发布；其余由编辑审核，也可以切换为完全人工发布。`],
    ],
    sourcesTitle: "来源",
    sources: "录音直接从 Wikimedia Commons 和互联网档案馆的 Musopen 合集播放。作曲家肖像和简介来自维基百科。每首录音的页面都链接到原始文件和许可协议，你随时可以自行核实版权。如果你认为某首录音不应被收录，请联系我们，我们会尽快移除。",
    contactTitle: "联系我们",
    email: "邮箱",
    phone: "电话",
    back: "← 返回聆听",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  const content = CONTENT[locale];
  return { title: content.title, description: content.description, alternates: { canonical: "/about" } };
}

export default async function AboutPage() {
  const { locale, t } = await getI18n();
  const content = CONTENT[locale];
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="eyebrow">{content.eyebrow}</p>
      <h1 className="display mt-4 text-[clamp(3rem,7vw,5.5rem)]">{content.heading}</h1>
      <div className="mt-8 grid gap-5 text-base leading-8 text-ink-2">
        {content.intro.map((paragraph) => <p key={paragraph.slice(0, 20)}>{paragraph}</p>)}
      </div>

      <section className="mt-14 rounded-3xl border border-line bg-card px-6 py-8 sm:px-10">
        <h2 className="display text-3xl">{t.nameStory.title}</h2>
        <p className="mt-4 font-serif text-xl italic leading-relaxed text-ink-2">{t.nameStory.body}</p>
        <p className="mt-5 text-sm text-muted">{t.dedication}</p>
      </section>

      <p className="ornament mt-16 font-serif text-xl">❦</p>

      <h2 className="display mt-12 text-4xl">{content.rulesTitle}</h2>
      <dl className="mt-8 grid gap-6 sm:grid-cols-2">
        {content.rules.map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-line bg-card p-5">
            <dt className="font-serif text-xl">{title}</dt>
            <dd className="mt-2 text-sm leading-6 text-muted">{body}</dd>
          </div>
        ))}
      </dl>

      <h2 className="display mt-16 text-4xl">{content.sourcesTitle}</h2>
      <p className="mt-4 text-sm leading-7 text-ink-2">{content.sources}</p>

      <h2 className="display mt-16 text-4xl">{content.contactTitle}</h2>
      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-5"><dt className="text-xs text-muted">{content.email}</dt><dd className="mt-1"><a href="mailto:Kun.li@ibm.com" className="text-accent hover:underline">Kun.li@ibm.com</a></dd></div>
        <div className="rounded-2xl border border-line bg-card p-5"><dt className="text-xs text-muted">{content.phone}</dt><dd className="mt-1"><a href="tel:+61451856126" className="text-accent hover:underline">+61 0451 856 126</a></dd></div>
      </dl>
      <p className="mt-10 text-sm"><Link href="/" className="font-semibold text-accent">{content.back}</Link></p>
    </div>
  );
}
