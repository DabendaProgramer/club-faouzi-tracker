import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Club Faouzi Tracker — Perf, Split 11 Jours & Rangs",
  description:
    "Application de suivi musculation mobile-first : échauffements, Top Set & Back-off 0.85x auto, cycle 11 jours ou planning personnalisé, mobilité chronométrée et badges Club Faouzi.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-950 text-zinc-50 flex flex-col selection:bg-yellow-500/30 selection:text-yellow-200">
        {children}
      </body>
    </html>
  );
}
