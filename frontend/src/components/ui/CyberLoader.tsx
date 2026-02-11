"use client";

import { useEffect, useState } from "react";
import styles from "./CyberLoader.module.css";

export default function CyberLoader() {
  const [stage, setStage] = useState<"LOADING" | "EXITING" | "HIDDEN">("LOADING");
  const [text, setText] = useState("INITIALIZING...");

  useEffect(() => {
    // 1. Changement de texte stylé
    setTimeout(() => setText("LOADING MODULES..."), 800);
    setTimeout(() => setText("DECRYPTING KEYS..."), 1500);
    
    // 2. Début de la fin (Exit Animation)
    const exitTimer = setTimeout(() => {
      setText("ACCESS GRANTED");
      setStage("EXITING");
    }, 2200); // Durée du chargement (2.2s)

    // 3. Suppression totale du DOM après l'anim
    const removeTimer = setTimeout(() => {
      setStage("HIDDEN");
    }, 2800); // 2.2s + 0.6s (durée anim CSS)

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (stage === "HIDDEN") return null;

  return (
    <div className={`${styles.loaderOverlay} ${stage === "EXITING" ? styles.exit : ''}`}>
      
      {/* 3D SPINNER */}
      <div className={styles.spinnerWrapper}>
        <div className={styles.ring1}></div>
        <div className={styles.ring2}></div>
        <div className={styles.core}></div>
      </div>

      {/* TEXTE & PROGRESS */}
      <div className={styles.textZone}>
        <div className={styles.statusText}>{text}</div>
        <div className={styles.progressBar}>
            <div className={styles.progressFill}></div>
        </div>
      </div>

    </div>
  );
}