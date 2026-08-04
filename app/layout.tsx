import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nightline — Unfiltered Adult Chat",
  description: "18+ AI sexting companion. Explicit, private, uncensored between consenting adults.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
