import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Learnly — Learning, personalized.",
    template: "%s | Learnly",
  },
  description:
    "Learnly adapts to what you actually know. Personalized learning paths for ADSA, Automata Theory, and DBMS — powered by AI and Bayesian Knowledge Tracing.",
  keywords: ["adaptive learning", "AI tutor", "BKT", "ADSA", "Automata Theory", "DBMS"],
  openGraph: {
    title: "Learnly — Learning, personalized.",
    description: "Your syllabus. Your gaps. Your learning path.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stone-950">{children}</body>
    </html>
  );
}
