import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nightline \u2014 Sexy AI Girl Chat",
  description:
    "18+ unfiltered AI sexting with sexy girl photos, custom backgrounds, and 3 talk levels.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
