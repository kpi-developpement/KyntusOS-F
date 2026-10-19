import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
// 1. IMPORT L PROVIDER
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kyntus Workflow",
  description: "Système de gestion de workflow Kyntus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {/* 2. GHELLEF L APP KAMLA B AUTHPROVIDER */}
        <AuthProvider>
          <AppShell>
             {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}