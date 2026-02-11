"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Terminal, Cpu, ShieldCheck } from "lucide-react";
import HeroScene from "@/components/3d/HeroScene"; 
import styles from "./Portal.module.css";
import AuthGuard from "@/components/layout/AuthGuard";

export default function PortalPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);
  
  // STATE NOUVEAU: Wach l'souris fou9 l'bouton?
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const enterSystem = () => {
    setExiting(true);
    setTimeout(() => {
        router.push("/");
    }, 800);
  };

  return (
    <AuthGuard>
        <div className={`${styles.container} ${exiting ? styles.zoomOut : ''}`}>
            
            {/* LAYER 1: 3D WORLD (On passe le state ici) */}
            <div className={styles.sceneWrapper}>
                {mounted && <HeroScene isHovered={isButtonHovered} />}
            </div>

            {/* LAYER 2: UI OVERLAY */}
            <div className={styles.uiLayer}>
                
                {/* HEADER */}
                <div className={styles.topBar}>
                    <div className={styles.statusBadge}>
                        <div className={styles.greenDot}></div>
                        SECURE CONNECTION ESTABLISHED
                    </div>
                    <div className={styles.codeRun}>
                        ID: ADMIN_ROOT // ACCESS: UNLIMITED
                    </div>
                </div>

                {/* CENTER ACTION */}
                <div className={styles.centerContent}>
                    
                    <button 
                        className={styles.crazyBtn} 
                        onClick={enterSystem}
                        // DETECTION DU HOVER
                        onMouseEnter={() => setIsButtonHovered(true)}
                        onMouseLeave={() => setIsButtonHovered(false)}
                    >
                        <span className={styles.btnContent}>
                            ACCÉDER AU CENTRE <ArrowRight className={styles.arrowAnim} />
                        </span>
                        <div className={styles.btnGlow}></div>
                        <div className={styles.btnBorder}></div>
                    </button>
                    
                    <div className={styles.warningText}>
                        <Terminal size={12} style={{display:'inline', marginRight:5}}/>
                        AUTHORIZED PERSONNEL ONLY // CLASSIFIED LEVEL 5
                    </div>
                </div>

                {/* FOOTER */}
                <div className={styles.footer}>
                    <div className={styles.techStack}>
                        <Cpu size={14} /> KYNTUS NEURAL CORE v4.0 <span style={{margin:'0 10px'}}>|</span> <ShieldCheck size={14} /> SYSTEM INTEGRITY: 100%
                    </div>
                </div>

            </div>
        </div>
    </AuthGuard>
  );
}