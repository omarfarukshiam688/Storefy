import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans, Noto_Sans_Bengali } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const _geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const _dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const _notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-bengali",
});

export const metadata: Metadata = {
  title: {
    default: "Storefy",
    template: "%s | Storefy",
  },
  description: "Multi-tenant SaaS platform for small businesses.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${_geist.variable} ${_geistMono.variable} ${_dmSans.variable} ${_notoSansBengali.variable}`}>
      <body className={`${_dmSans.className} font-sans antialiased`}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
