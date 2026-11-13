import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import Backdrop from "@/components/Backdrop";
import { PRODUCT } from "@/lib/brand";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${PRODUCT.name} - ${PRODUCT.tagline}`,
  description: PRODUCT.description,
};

export const viewport: Viewport = {
  themeColor: "#f2f4f9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable}`}>
        <Backdrop />
        {children}
      </body>
    </html>
  );
}
