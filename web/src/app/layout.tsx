import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ProofMarket — No vote. No dispute window. Just math.",
  description:
    "Parimutuel World Cup prediction markets on Solana devnet, settled trustlessly by a single on-chain validate_stat proof — no human vote, no dispute window.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font variables live on <html>: Tailwind preflight sets `html { font-family: var(--font-geist-sans), sans-serif }`,
    // and a custom property defined only on <body> is invisible there — the declaration then fails at
    // computed-value time and the browser falls back to its default serif (seen on the deployed site).
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
