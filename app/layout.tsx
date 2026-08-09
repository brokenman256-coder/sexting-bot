import type { Metadata } from "next";
import "./globals.css";
import "./ui-extra.css";

export const metadata: Metadata = {
  title: "Nightline — Unrestricted AI Sex Chat",
  description:
    "18+ AI companions · women, men, gay & more · 3 talk levels · media · voice · admin credits",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
