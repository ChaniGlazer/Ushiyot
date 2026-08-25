import type { Metadata } from "next";
import { Heebo, IBM_Plex_Sans_Hebrew, Rubik } from "next/font/google";
import LivingBackground from "@/components/motion/LivingBackground";
import "./tokens.css";
import "./globals.css";

// Body text and general UI (Body: 400/16px/1.67, Small: 400/14px/1.5 - see app/tokens.css).
const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
});

// Headings and data (H1: 700/36px/1.3/-0.01em, H2: 600/24px/1.4/0em).
const ibmPlexSansHebrew = IBM_Plex_Sans_Hebrew({
  subsets: ["hebrew", "latin"],
  weight: ["600", "700"],
  variable: "--font-ibm-plex-sans-hebrew",
});

// Tags and micro-labels (500/12px/letter-spacing 0.02em).
const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["500"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "ניצוץ",
  description: "רעיונות תוכן יומיים מותאמים אישית ליוצרים ואושיות רשת",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} ${ibmPlexSansHebrew.variable} ${rubik.variable}`}
    >
      <body>
        <LivingBackground />
        {children}
      </body>
    </html>
  );
}
