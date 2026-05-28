import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sistema Canogar — Inventario",
  description: "Gestión confidencial de obras, ejemplares y ventas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sourceSans.variable} h-full`}>
      <body className={`${sourceSans.className} min-h-full bg-stone-50 text-lg text-stone-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
