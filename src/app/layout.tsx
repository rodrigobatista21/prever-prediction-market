import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TesePro - Mercado de Teses Brasileiro",
    template: "%s | TesePro",
  },
  description:
    "Plataforma profissional de análise preditiva. Negocie teses sobre política, economia e mercados. Dados, não apostas.",
  keywords: [
    "prediction market",
    "análise preditiva",
    "brasil",
    "política",
    "economia",
    "teses",
    "mercado financeiro",
    "trading",
  ],
  authors: [{ name: "TesePro" }],
  creator: "TesePro",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://tesepro.com.br",
    siteName: "TesePro",
    title: "TesePro - Mercado de Teses Brasileiro",
    description: "Plataforma profissional de análise preditiva para traders e analistas.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TesePro - Mercado de Teses Brasileiro",
    description: "Plataforma profissional de análise preditiva para traders e analistas.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background flex flex-col`}
      >
        <Header />
        <main className="container py-8 flex-1">{children}</main>
        <Footer />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
