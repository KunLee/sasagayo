import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-xl px-4 py-28 text-center">
      <p className="font-serif text-2xl text-gold">𝄐</p>
      <h1 className="display mt-4 text-5xl">{t.notFound.title}</h1>
      <p className="mt-4 text-sm text-muted">{t.notFound.body}</p>
      <Link href="/" className="mt-8 inline-block rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper">{t.notFound.back}</Link>
    </div>
  );
}
