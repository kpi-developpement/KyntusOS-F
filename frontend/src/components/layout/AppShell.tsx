"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import NotificationCenter from "@/components/features/NotificationCenter";
import InteractiveBackground from "@/components/ui/InteractiveBackground";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // \ud83d\udd0d LISTE DES PAGES SANS SIDEBAR (Login + Portal)
  const isPublicPage = pathname === "/login" || pathname === "/portal";
  
  // Pilot a son propre layout, donc on cache aussi
  const isPilotSection = pathname?.startsWith("/pilot");

  const showSidebar = !isPublicPage && !isPilotSection;

  return (
    <>
      {/* Background global sauf si la page a le sien */}
      <div style={{zIndex: -1}}>
          <InteractiveBackground />
      </div>

      {showSidebar && <Sidebar />}

      <main 
        style={{ 
          marginLeft: showSidebar ? "80px" : "0px", 
          minHeight: "100vh",
          position: "relative",
          zIndex: 10,
          transition: "margin-left 0.3s ease"
        }}
      >
        {!isPublicPage && !isPilotSection && <NotificationCenter />}
        {children}
      </main>
    </>
  );
}