import type { Metadata, Viewport } from "next";
import { Fraunces, Inter_Tight } from "next/font/google";
import "./globals.css";

const display = Fraunces({ variable: "--font-display", subsets: ["latin"], axes: ["SOFT", "opsz"] });
const sans = Inter_Tight({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vote Oracle — your California ballot, decoded",
  description:
    "Swipe through quick gut-check questions and get personalized, nonpartisan picks for every race and proposition on your November 3, 2026 California ballot. No accounts, nothing stored.",
  openGraph: {
    title: "Vote Oracle",
    description: "Swipe. Reveal your values. Get your California ballot, decoded.",
  },
};

export const viewport: Viewport = {
  themeColor: "#14110f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-ink text-paper font-sans">{children}</body>
    </html>
  );
}
