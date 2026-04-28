"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AuthGuard from "@/components/layout/AuthGuard";
import InteractiveBackground from "@/components/ui/InteractiveBackground"; // Hada howa CyberMatrixBackground dyalna
import PilotNavbar from "@/components/layout/PilotNavbar"; 
import Toaster from "@/components/ui/Toaster";
import CyberLoader from "@/components/ui/CyberLoader"; 
import HoloBackButton from "@/components/ui/HoloBackButton"; 
import styles from "./PilotLayout.module.css";

export default function PilotLayout({ children }: { children: React.ReactNode }) {
  const [contentReady, setContentReady] = useState(false);
  const pathname = usePathname(); 
  const isHome = pathname === "/pilot/home";

  useEffect(() => {
    const timer = setTimeout(() => {
      setContentReady(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthGuard>
      <div className={styles.pilotShell}>
        
        {/* Layer 1: LOADER (Dima Top waqt l-chargement) */}
        <CyberLoader />

        {/* Layer 2: BACKGROUND + MODIFIER PANEL */}
        {/* ⚠️ Hada dkhl westu l-Modifier Panel li fih z-index 999,999,999 ⚠️ */}
        <InteractiveBackground />
        
        {/* Layer 3: CONTENU PRINCIPAL */}
        <div style={{ 
            opacity: contentReady ? 1 : 0, 
            transition: "opacity 0.3s ease",
            position: "relative",
            /* ❌ 7IYDNA Z-INDEX: 10 HNA BACH MAY-7BECH L-BACKGROUND ❌ */
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh"
        }}>
            {!isHome && <PilotNavbar />}
            {!isHome && <HoloBackButton />}

            <div 
              className={!isHome ? styles.contentWrapper : ""} 
              style={{ 
                flex: 1, 
                display: "flex", 
                flexDirection: "column",
                paddingTop: isHome ? "0px" : "120px",
                /* Z-index hna machi mochkil hit l-panel dyal background rah "Fixed" */
              }}
            >
               <AnimatePresence mode="wait">
                 <motion.div
                   key={pathname}
                   initial={{ opacity: 0, y: 15 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   transition={{ 
                     duration: 0.35, 
                     ease: [0.22, 1, 0.36, 1] 
                   }}
                   style={{ flex: 1, display: "flex", flexDirection: "column" }}
                 >
                   {children}
                 </motion.div>
               </AnimatePresence>
            </div>
        </div>

        {/* Layer 4: NOTIFICATIONS (Dima Top) */}
        <Toaster />
        
      </div>
    </AuthGuard>
  );
}