"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AuthGuard from "@/components/layout/AuthGuard";
import InteractiveBackground from "@/components/ui/InteractiveBackground";
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
        
        {/* Layer 1: LOADER */}
        <CyberLoader />

        {/* Layer 2: Background (Particles) */}
        <InteractiveBackground />
        
        {/* Layer 3: Contenu */}
        <div style={{ 
            opacity: contentReady ? 1 : 0, 
            transition: "opacity 0.3s ease",
            position: "relative",
            zIndex: 10,
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
                paddingTop: isHome ? "0px" : "120px"
              }}
            >
               {/* 💎 L-ANIMATION PREMIUM (Minimalist & Smooth) 💎 */}
               <AnimatePresence mode="wait">
                 <motion.div
                   key={pathname}
                   initial={{ opacity: 0, y: 15 }} // Kat-bda habta ghir b' 15px
                   animate={{ opacity: 1, y: 0 }}  // Kat-tle3 l-blast-ha
                   exit={{ opacity: 0, y: -10 }}   // Kat-khrej l-foq chwiya
                   transition={{ 
                     duration: 0.35, 
                     ease: [0.22, 1, 0.36, 1] // 👈 Hada howa s-serr! Easing Curve dyal Apple/Vercel (Custom Cubic Bezier)
                   }}
                   style={{ flex: 1, display: "flex", flexDirection: "column" }}
                 >
                   {children}
                 </motion.div>
               </AnimatePresence>
            </div>
        </div>

        {/* Layer 4: Notifications */}
        <Toaster />
        
      </div>
    </AuthGuard>
  );
}