import { Martian_Mono, Inter_Tight, JetBrains_Mono } from "next/font/google";

export const martianMono = Martian_Mono({
  subsets: ["latin"],
  variable: "--font-martian",
  display: "block",
});

export const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "block",
});

export const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "block",
});
