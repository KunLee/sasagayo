import { cookies, headers } from "next/headers";
import { dictionaries, LOCALE_COOKIE, pickLocale } from "./index.ts";

/** The visitor's locale and dictionary, for server components and metadata. */
export async function getI18n() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const locale = pickLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerStore.get("accept-language"));
  return { locale, t: dictionaries[locale] };
}
