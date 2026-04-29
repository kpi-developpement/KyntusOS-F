"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic"; 
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, LayoutDashboard, Database, Cpu, 
  Settings, History, Layers, ShieldCheck 
} from "lucide-react";

import HolographicCard from "./components/HolographicCard";
import CyberHud from "./components/CyberHud";

// 🚀 L-FADA2 DYNAMIC IMPORT (Kay-t-charga f' l-Kwaliss) 🚀
const SpaceBackground = dynamic(() => import("../ventilation/ux/SpaceBackground"), { ssr: false });

export default function PilotHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // 🔥 L-STATE DYAL L-LOADER 🔥
  const [isEngineReady, setIsEngineReady] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("kyntus_user");
    if (stored) setUser(JSON.parse(stored));

    // ⚡ L-QALEB DYAL 240 FPS: Kan-3tiw l-WebGL 1.2 seconds bash y-compily les Shaders 
    // Bla may-bloki l-Main Thread. Mlli kay-t-7yed l-Loader, l-Page kat-koun khfiiiifa!
    const timer = setTimeout(() => {
      setIsEngineReady(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const modules = [
    { 
      id: "board", 
      title: "Analyse", 
      path: "/pilot/board", 
      icon: Terminal, 
      color: "#f59e0b", 
      desc: "Analyse et édition des données brutes.", 
      status: "ONLINE", 
      model: "MATRIX_V1" 
    },
    { 
      id: "kanban", 
      title: "Tableau de tâches", 
      path: "/pilot/kanban", 
      icon: LayoutDashboard, 
      color: "#39ff14", 
      desc: "Pilotage et suivi des tâches en temps réel.", 
      status: "ONLINE", 
      model: "TACTICAL_HUD" 
    },
    { 
      id: "facture", 
      title: "Facture", 
      path: "/pilot/facture", 
      icon: Cpu, 
      color: "#b026ff", 
      desc: "Moteur de calcul et génération des factures.", 
      status: "ONLINE", 
      model: "ENGINE_X" 
    },
    { 
      id: "recorde", 
      title: "Base de données", 
      path: "/pilot/recorde", 
      icon: Database, 
      color: "#00f0ff", 
      desc: "Gestion centrale des données et versions.", 
      status: "SECURE", 
      model: "DB_CORE" 
    },
    { 
      id: "ventilation", 
      title: "Ventilation", 
      path: "/pilot/ventilation", 
      icon: Layers, 
      color: "#ef4444", 
      desc: "Suivi et répartition des flux financiers.", 
      status: "ONLINE", 
      model: "CHRONOS_9" 
    },
    { 
      id: "parametrage", 
      title: "Paramétrage", 
      path: "/pilot/parametrage", 
      icon: Settings, 
      color: "#38bdf8", 
      desc: "Configuration des règles du système.", 
      status: "ONLINE", 
      model: "SYS_CONFIG" 
    },
    { 
      id: "history", 
      title: "Archive", 
      path: "/pilot/history", 
      icon: History, 
      color: "#d8b4fe", 
      desc: "Historique, logs et KPIs des missions.", 
      status: "ARCHIVED", 
      model: "ARCHIVE_X" 
    }
];

  const handleLaunchSequence = (path: string) => {
    setIsNavigating(true); 
    // L-Animation dyal L-Khorja, 3ad n-beddlou l-Page
    setTimeout(() => { router.push(path); }, 1500); 
  };

  if (!mounted) return <div style={{ minHeight: "100vh", backgroundColor: "#02040a" }} />;

  return (
    <main style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 1rem", position: "relative", zIndex: 10, minHeight: "100vh", overflow: "hidden" }}>
      
      {/* 🌌 L-BACKGROUND W L-HUD DIMA KHEDDAMIN F' L-KWALISS 🌌 */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: -2, pointerEvents: "none" }}>
        <SpaceBackground isWarping={isNavigating} hoverColor={activeColor} />
      </div>
      <CyberHud activeColor={activeColor} />

      <AnimatePresence mode="wait">
        {!isEngineReady ? (
          /* 💎 L-LOADER KHFIIIF W NQII (Bash y-wjd l-Fada2) 💎 */
          <motion.div
            key="premium-loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              backgroundColor: "#02040a" // Nfs Loun dyal l-Layout
            }}
          >
            {/* L-Khit d-do li kay-jri */}
            <div style={{ width: "100px", height: "2px", background: "rgba(255,255,255,0.05)", overflow: "hidden", borderRadius: "2px" }}>
              <motion.div
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                style={{ width: "50%", height: "100%", background: "#00f0ff", boxShadow: "0 0 10px #00f0ff" }}
              />
            </div>
            <div style={{ marginTop: "1rem", color: "#64748b", fontFamily: "monospace", fontSize: "0.75rem", letterSpacing: "4px", fontWeight: "bold" }}>
              COMPILING SHADERS...
            </div>
          </motion.div>
        ) : (
          /* 🎬 L-CONTENU LI KAY-DKHEL (Les Transformers 3D dyalek kima 3jbouk!) 🎬 */
          <motion.div
            key="main-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: isNavigating ? 0 : 1, 
              y: isNavigating ? -20 : 0,
              filter: isNavigating ? "blur(10px)" : "blur(0px)",
              scale: isNavigating ? 0.95 : 1
            }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} 
            style={{ width: "100%", maxWidth: "1400px", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "5vh", paddingBottom: "4rem" }}
          >
            {/* HEADER TACTIQUE */}
            <div style={{ width: "100%", maxWidth: "800px", marginBottom: "4rem", display: "flex", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "25px", background: "rgba(10, 15, 30, 0.4)", padding: "1.5rem 3rem", borderRadius: "100px", border: "1px solid rgba(0, 240, 255, 0.2)", backdropFilter: "blur(20px)", boxShadow: `0 0 50px ${activeColor || '#00f0ff'}30`, transition: "box-shadow 0.4s ease", width: "100%" }}>
                <div style={{ background: "rgba(0, 240, 255, 0.1)", padding: "15px", borderRadius: "50%", border: "1px solid rgba(0, 240, 255, 0.4)", boxShadow: "inset 0 0 20px rgba(0, 240, 255, 0.5)", flexShrink: 0 }}>
                  <ShieldCheck size={35} color={activeColor || "#00f0ff"} style={{ transition: "color 0.4s ease", filter: `drop-shadow(0 0 10px ${activeColor || '#00f0ff'})` }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h1 style={{ margin: 0, fontSize: "2.2rem", color: "#fff", fontFamily: "monospace", letterSpacing: "3px", fontWeight: "900", textTransform: "uppercase" }}>
                    AWAITING <span style={{ color: activeColor || "#00f0ff", textShadow: `0 0 20px ${activeColor || '#00f0ff'}`, transition: "color 0.4s ease, text-shadow 0.4s ease" }}>COMMAND</span>
                  </h1>
                  <p style={{ color: "#64748b", margin: "2px 0 0 0", fontFamily: "monospace", fontSize: "0.9rem", letterSpacing: "2px" }}>
                    // PILOT: {user?.username?.toUpperCase() || "UNKNOWN"}
                  </p>
                </div>
              </div>
            </div>

            {/* GRID DES MODULES 3D (Transformers 3D) */}
            <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "30px", perspective: "2000px" }}>
              {modules.map((mod, i) => (
                <HolographicCard 
                  key={mod.id} mod={mod} index={i}
                  onHoverStart={() => setActiveColor(mod.color)}
                  onHoverEnd={() => setActiveColor(null)}
                  onClick={() => handleLaunchSequence(mod.path)} 
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}