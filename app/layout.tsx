import Header from "../components/Header";
import Footer from "../components/Footer";
import "./globals.css";
import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import PresenceTracker from "@/components/PresenceTracker";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: { default: "Sasagayo — Music, remembered", template: "%s | Sasagayo" },
  description:
    "A community for sharing the songs, stories, and recommendations that move us.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="ember"
      className={cn("font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('sasagayo-theme');if(['ember','violet','ocean','midnight','paper'].includes(t))document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body>
        <div className="site">
          <PresenceTracker />
          <Header />
          <main>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
