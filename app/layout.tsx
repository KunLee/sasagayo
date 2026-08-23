import Header from '../components/Header';
import Footer from '../components/Footer';
import './globals.css';
import type { ReactNode } from 'react';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata = {
  title: { default: 'Sasagayo — Music, remembered', template: '%s | Sasagayo' },
  description: 'A community for sharing the songs, stories, and recommendations that move us.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <div className="site"><Header /><main>{children}</main><Footer /></div>
      </body>
    </html>
  );
}
