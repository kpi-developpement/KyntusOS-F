"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react"; // Icone Admin
import styles from "./AdminLoader.module.css";

export default function AdminLoader() {
  const [stage, setStage] = useState<"LOADING" | "EXITING" | "HIDDEN">("LOADING");
  const [text, setText] = useState("CONNECTING...");

  useEffect(() => {
    // Séquence de démarrage "Corporate/Admin"
    setTimeout(() => setText("VERIFYING CREDENTIALS..."), 800);
    setTimeout(() => setText("ESTABLISHING SECURE UPLINK..."), 1600);
    
    // Déclenchement de la sortie
    const exitTimer = setTimeout(() => {
      setText("ACCESS GRANTED");
      setStage("EXITING");
    }, 2400);

    // Nettoyage final
    const removeTimer = setTimeout(() => {
      setStage("HIDDEN");
    }, 3200); // 2400 + 800ms animation

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (stage === "HIDDEN") return null;

  return (
    <div className={`${styles.overlay} ${stage === "EXITING" ? styles.exit : ''}`}>
      
      {/* SCAN LINE EFFECT */}
      <div className={styles.scanLine}></div>

      {/* CORE SPINNER */}
      <div className={styles.hexContainer}>
        <div className={styles.hex1}></div>
        <div className={styles.hex2}></div>
        <div className={styles.core}>
            <ShieldCheck size={40} color="white" />
        </div>
      </div>

      {/* TEXT INFO */}
      <div className={styles.textZone}>
        <div className={styles.title}>COMMAND CENTER</div>
        <div className={styles.status}>{text}</div>
      </div>

    </div>
  );
}