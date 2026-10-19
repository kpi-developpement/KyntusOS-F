"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function PageTransitionLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMounting, setIsMounting] = useState(true);

  useEffect(() => {
    // Finma tbedel la page, kan-affichiw loader khfif bach n-hniwk mn l-glitch (FOUC / Canvas init)
    setIsMounting(true);
    const timer = setTimeout(() => {
      setIsMounting(false);
    }, 280); // 280ms kafya bach Three.js w CSS y-akhdou blasthoum

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <style>{`
        @keyframes kyntusPulseSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .kyntus-loader-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: rgba(248, 250, 252, 0.88);
          backdrop-filter: blur(20px) saturate(180%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: all;
        }
        .kyntus-top-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #0052FF 0%, #0EA5E9 50%, #0052FF 100%);
          box-shadow: 0 0 14px rgba(0, 82, 255, 0.6);
          z-index: 100000;
          transform-origin: left;
        }
        .kyntus-spinner-ring {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 3px solid rgba(0, 82, 255, 0.12);
          border-top-color: #0052FF;
          border-right-color: #0EA5E9;
          animation: kyntusPulseSpin 0.65s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          box-shadow: 0 8px 24px rgba(0, 82, 255, 0.18);
        }
      `}</style>

      {/* 🚀 ULTRA-LIGHT OVERLAY LOADER */}
      <AnimatePresence mode="wait">
        {isMounting && (
          <motion.div
            key="kyntus-global-loader"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="kyntus-loader-overlay"
          >
            {/* Top Laser Progress Bar */}
            <motion.div
              className="kyntus-top-bar"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.26, ease: "easeInOut" }}
            />

            {/* Minimalist Luxury Spinner */}
            <div className="kyntus-spinner-ring" />
            <span
              style={{
                marginTop: "14px",
                fontSize: "0.74rem",
                fontWeight: 800,
                letterSpacing: "0.18em",
                color: "#0052FF",
                textTransform: "uppercase",
              }}
            >
              KYNTUS SYNC...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🌟 CONTENU DYAL LA PAGE B FADE-IN FLUIDE */}
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.08 }}
      >
        {children}
      </motion.div>
    </div>
  );
}