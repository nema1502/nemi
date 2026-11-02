import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({ variable: "--font-lexend", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Nemi: lesson videos from your textbook",
  description:
    "Turn a textbook chapter or a topic into an animated lesson video your students finish. Built with Meta's Muse Spark, Muse Image, SAM 3.1 and Muse Voice Transcribe.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lexend.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
