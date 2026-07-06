import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Shell } from "@/components/ledger/Shell";

// Settlement Ledger typography: Space Mono for hashes/labels, Helvetica system
// stack for display/body (defined in tailwind fontFamily.sans/display — no web font).
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ProofMarket — No vote. No dispute window. Just math.",
  description:
    "World Cup football prediction markets on Solana devnet, settled trustlessly by a single on-chain validate_stat proof — no human vote, no dispute window.",
};

// Applies the persisted theme before first paint so there is no flash. Default
// SSR theme is "paper"; this only re-points when localStorage says "terminal".
const noFlashTheme = `try{var t=localStorage.getItem('pm-theme');if(t==='terminal'||t==='paper'){document.documentElement.dataset.theme=t}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font var lives on <html> so Tailwind preflight's `html { font-family }` resolves it.
    // suppressHydrationWarning: the no-flash script may set data-theme before hydration.
    <html lang="en" data-theme="paper" className={spaceMono.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
