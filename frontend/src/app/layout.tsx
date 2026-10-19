import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
// 1. IMPORT L PROVIDER
import { AuthProvider } from "@/context/AuthContext";
// 2. IMPORT L-ANTI-GLITCH LOADER
import PageTransitionLoader from "@/components/layout/PageTransitionLoader";

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
      <body
        className={inter.className}
        style={{
          backgroundColor: "#F8FAFC",
          color: "#0F172A",
          margin: 0,
          overflowX: "hidden",
        }}
      >
        {/* GHELLEF L APP KAMLA B AUTHPROVIDER */}
        <AuthProvider>
          <AppShell>
            {/* 🔥 ANTI-GLITCH SMOOTH LOADER 🔥 */}
            <PageTransitionLoader>
              {children}
            </PageTransitionLoader>
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}