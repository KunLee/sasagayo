import { COMPOSER_BY_SLUG, type Composer } from "../composers.ts";
import { en, type Dictionary } from "./en.ts";
import { zh } from "./zh.ts";

export type Locale = "en" | "zh";
export type { Dictionary };
export const LOCALE_COOKIE = "lang";
export const dictionaries: Record<Locale, Dictionary> = { en, zh };

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "zh";
}

/** Cookie wins; otherwise follow the browser's preferred language. */
export function pickLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  const first = (acceptLanguage ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("zh") ? "zh" : "en";
}

/** Composer name in the reader's language (full and short forms). */
export function composerLabel(composer: Composer | undefined, locale: Locale, fallback = "") {
  if (!composer) return { name: fallback, short: fallback };
  return locale === "zh" ? { name: composer.zh, short: composer.zh } : { name: composer.name, short: composer.short };
}

export function composerNameBySlug(slug: string, locale: Locale, fallback: string) {
  return composerLabel(COMPOSER_BY_SLUG.get(slug), locale, fallback).name;
}
