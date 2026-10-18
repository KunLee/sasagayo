import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PlayerProvider from "@/components/player/PlayerProvider";
import SessionProvider from "@/components/SessionProvider";
import { SITE_URL } from "@/lib/format";
import "./globals.css";

const serif = Cormorant_Garamond({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-cormorant" });
const sans = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Sasagayo — Open classical music", template: "%s · Sasagayo" },
  description: "A growing library of great classical recordings in the public domain or under open licences. Listen, save, and share — free.",
  openGraph: { siteName: "Sasagayo", type: "website" },
  twitter: { card: "summary_large_image" },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f2e8" },
    { media: "(prefers-color-scheme: dark)", color: "#13110f" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <SessionProvider>
          <PlayerProvider>
            <Header />
            <main>{children}</main>
            <Footer />
          </PlayerProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
