import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: { default: "Resonate — your music, your way", template: "%s · Resonate" },
  description:
    "Search YouTube for music, build playlists and queues, and listen in a player made for music. Powered by the official YouTube player.",
  applicationName: "Resonate",
  appleWebApp: { capable: true, title: "Resonate", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 5,
};

/** Applies the saved accent before first paint. The theme is always dark. */
const ACCENT_BOOT = `(function(){try{
  document.documentElement.dataset.accent=localStorage.getItem('resonate:accent')||'ember';
}catch(e){document.documentElement.dataset.accent='ember';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-accent="ember" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: ACCENT_BOOT }} />
      </head>
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[200] focus:rounded-lg focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:font-medium focus:text-[var(--on-accent)]"
        >
          Skip to content
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
