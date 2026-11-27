"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import NotificationCenter from "@/components/features/NotificationCenter";
import InteractiveBackground from "@/components/ui/InteractiveBackground";
import styles from "./AppShell.module.css";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Pages sans sidebar : connexion, portail, et toute la zone pilote (elle a sa navbar)
  const isPublicPage = pathname === "/login" || pathname === "/portal";
  const isPilotSection = pathname?.startsWith("/pilot");
  const showSidebar = !isPublicPage && !isPilotSection;

  return (
    <>
      {/* La zone pilote rend son propre fond */}
      {!isPilotSection && <InteractiveBackground />}

      {showSidebar && <Sidebar />}

      <main className={showSidebar ? styles.withSidebar : styles.full}>
        {showSidebar && <NotificationCenter />}
        <div key={pathname} className={showSidebar ? styles.pageIn : undefined}>{children}</div>
      </main>
    </>
  );
}
