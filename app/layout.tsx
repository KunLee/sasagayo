import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import I18nProvider from "@/components/I18nProvider";
import PlayerProvider from "@/components/player/PlayerProvider";
import SessionProvider from "@/components/SessionProvider";
import { SITE_URL } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const serif = Cormorant_Garamond({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-cormorant" });
const sans = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.site.title, template: "%s · Sasagayo" },
    description: t.site.description,
    applicationName: "Sasagayo",
    openGraph: { siteName: "Sasagayo", type: "website", locale: t.locale === "zh" ? "zh_CN" : "en_AU" },
    twitter: { card: "summary_large_image" },
    manifest: "/site.webmanifest",
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f2e8" },
    { media: "(prefers-color-scheme: dark)", color: "#13110f" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale } = await getI18n();
  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"} className={`${serif.variable} ${sans.variable}`}>
      <body>
        <I18nProvider locale={locale}>
          <SessionProvider>
            <PlayerProvider>
              <Header />
              <main>{children}</main>
              <Footer />
            </PlayerProvider>
          </SessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
