"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/layout/AuthGuard";
import InteractiveBackground from "@/components/ui/InteractiveBackground";
import PilotNavbar from "@/components/layout/PilotNavbar"; 
import Toaster from "@/components/ui/Toaster";
import CyberLoader from "@/components/ui/CyberLoader"; 
import styles from "./PilotLayout.module.css";

export default function PilotLayout({ children }: { children: React.ReactNode }) {
  // State bach nkhbbiw l'contenu f l'bdya
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    // Ntsennaw ghir chwia (50ms) binma l'Loader y-mounta w yched l'écran
    // 3ad n-affichiw l'contenu morah
    const timer = setTimeout(() => {
      setContentReady(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthGuard>
      <div className={styles.pilotShell}>
        
        {/* Layer 1: LOADER (Dima Visible f l'bdya) */}
        {/* Howa li kayghatti l'ecran kaml */}
        <CyberLoader />

        {/* Layer 2: Background (Particles) */}
        <InteractiveBackground />
        
        {/* Layer 3: Contenu (Navbar + Page) */}
        {/* Hna fin kaina l'Astuce: Opacity 0 hta ykoun ContentReady */}
        <div style={{ 
            opacity: contentReady ? 1 : 0, 
            transition: "opacity 0.1s ease-in",
            position: "relative",
            zIndex: 10
        }}>
            <PilotNavbar />

            <div className={styles.contentWrapper} style={{paddingTop: "120px"}}>
               {children}
            </div>
        </div>

        {/* Layer 4: Notifications */}
        <Toaster />
        
      </div>
    </AuthGuard>
  );
}