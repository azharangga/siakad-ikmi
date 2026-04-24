import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Chatbot } from "@/components/chat/Chatbot";
import NextTopLoader from "nextjs-toploader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cambria = localFont({
  src: [
    { path: "../public/fonts/Cambria.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/cambriab.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/cambriai.ttf", weight: "400", style: "italic" },
    { path: "../public/fonts/cambriaz.ttf", weight: "700", style: "italic" },
  ],
  variable: "--font-cambria",
});

// --- KONFIGURASI SEO & METADATA ---
export const metadata: Metadata = {
  title: "SIAKAD STMIK IKMI Cirebon",
  description: "Sistem Informasi Akademik STMIK IKMI Cirebon",
  keywords: [
    "SIAKAD",
    "STMIK IKMI",
    "IKMI Cirebon",
    "SIAKAD IKMI",
    "Akademik",
    "Kampus Cirebon",
    "Teknik Informatika",
    "Rekayasa Perangkat Lunak",
  ],
  authors: [{ name: "Azharangga Kusuma" }],
  creator: "Azharangga Kusuma",
  publisher: "Azharangga Kusuma",

  icons: {
    icon: "/img/logo-ikmi.png",
    shortcut: "/img/logo-ikmi.png",
    apple: "/img/logo-ikmi.png",
  },

  openGraph: {
    title: "SIAKAD STMIK IKMI Cirebon",
    description: "Sistem Informasi Akademik STMIK IKMI Cirebon.",
    url: "https://ikmi.ac.id",
    siteName: "SIAKAD IKMI",
    images: [
      {
        url: "/img/logo-ikmi.png",
        width: 800,
        height: 800,
        alt: "Logo STMIK IKMI Cirebon",
      },
    ],
    locale: "id_ID",
    type: "website",
  },

  robots: {
    index: true,
    follow: true,
    nocache: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cambria.variable} antialiased bg-slate-100`}
      >
        <NextTopLoader
          color="#1B3F95"
          initialPosition={0.1}
          crawlSpeed={150}
          height={4}
          crawl={true}
          showSpinner={false}
          easing="cubic-bezier(0.24, 0.22, 0.015, 1.2)"
          speed={400}
          shadow="0 0 15px #1B3F95, 0 0 10px #1B3F95, 0 0 5px #1B3F95"
          zIndex={1600}
        />
        {children}
        <Toaster />
        <Chatbot />
      </body>
    </html>
  );
}
