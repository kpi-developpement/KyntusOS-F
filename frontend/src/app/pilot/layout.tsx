"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AuthGuard from "@/components/layout/AuthGuard";
import InteractiveBackground from "@/components/ui/InteractiveBackground";
import PilotNavbar from "@/components/layout/PilotNavbar";
import Toaster from "@/components/ui/Toaster";
import CyberLoader from "@/components/ui/CyberLoader";
import styles from "./PilotLayout.module.css";

export default function PilotLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/pilot/home";

  return (
    <AuthGuard>
      <div className={styles.shell}>
        <CyberLoader />
        <InteractiveBackground />
        {!isHome && <PilotNavbar />}

        <div className={isHome ? styles.homeWrapper : styles.contentWrapper}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              className={styles.page}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        <Toaster />
      </div>
    </AuthGuard>
  );
}
