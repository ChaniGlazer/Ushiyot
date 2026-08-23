import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./tokens.css";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
});

export const metadata: Metadata = {
  title: "ניצוץ",
  description: "רעיונות תוכן יומיים מותאמים אישית ליוצרים ואושיות רשת",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body>{children}</body>
    </html>
  );
}
