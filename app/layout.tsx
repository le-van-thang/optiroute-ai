import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/components/providers/AuthProvider";
import { LangProvider } from "@/components/providers/LangProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { ClientLayout } from "@/components/layout/ClientLayout";
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
  title: "OptiRoute AI - Smart Itinerary & Split-Bill Ledger",
  description: "Create AI-powered smart travel itineraries equipped with open maps and built-in split bill ledgers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#020817] text-slate-50">
        <LangProvider>
          <ToastProvider>
            <AuthProvider>
              <ClientLayout>
                {children}
              </ClientLayout>
            </AuthProvider>
          </ToastProvider>
        </LangProvider>
      </body>
    </html>
  );
}
