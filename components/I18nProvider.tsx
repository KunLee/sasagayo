"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useTransition, type ReactNode } from "react";
import { dictionaries, LOCALE_COOKIE, type Dictionary, type Locale } from "@/lib/i18n";

type I18n = { locale: Locale; t: Dictionary; setLocale: (locale: Locale) => void; switching: boolean };
const I18nContext = createContext<I18n | null>(null);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}

export default function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();
  const [switching, startTransition] = useTransition();
  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
    startTransition(() => router.refresh());
  }, [router]);
  const value = useMemo(() => ({ locale, t: dictionaries[locale], setLocale, switching }), [locale, setLocale, switching]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, t, setLocale, switching } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
      aria-label={t.switchLabel}
      title={t.switchLabel}
      disabled={switching}
      className={`h-10 shrink-0 rounded-full px-3 text-sm font-medium text-ink-2 transition hover:text-accent disabled:opacity-50 ${className}`}
    >
      {t.switchTo}
    </button>
  );
}
