import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Great_Vibes, Inter } from "next/font/google";

import "./globals.css";

/**
 * Two families, each with a job.
 *
 * Fraunces is the café: a soft, slightly characterful serif that carries the
 * wordmark and the page headings. Inter does everything functional — prices,
 * labels, buttons, tables — because it has the clearest digits at small sizes
 * and proper tabular figures, which the totals depend on.
 *
 * Both are self-hosted through next/font, so no third-party request sits on the
 * critical path of a till that has to open fast on café wifi.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Two script faces, used only on the welcome screen.
 *
 * The approved design leans on two distinct hands: a formal copperplate for
 * "Welcome!" and a casual marker for the margin notes. One face cannot do both
 * — set the casual one large and it reads as a note, not a greeting. They load
 * on the welcome route only and never reach the till or the dashboard.
 */
const greatVibes = Great_Vibes({
  variable: "--font-script-face",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-hand-face",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nature Caffe",
  description: "Nature Caffe — café billing and point of sale.",
};

export const viewport: Viewport = {
  themeColor: "#f7efe6",
  // The POS lives on a counter tablet; a pinch-zoomed till is a mis-tapped till.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${greatVibes.variable} ${caveat.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
