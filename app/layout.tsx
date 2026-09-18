import type { Metadata } from "next";
import "./globals.css";
import clsx from "clsx";
import { interTight, jetBrainsMono, martianMono } from "./fonts";

export const metadata: Metadata = {
  title: "WikiPulse",
  description: "Brief Wiki event analyzes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={clsx(
        interTight.variable,
        martianMono.variable,
        jetBrainsMono.variable,
        "h-full antialiased",
        jetBrainsMono.className,
      )}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
