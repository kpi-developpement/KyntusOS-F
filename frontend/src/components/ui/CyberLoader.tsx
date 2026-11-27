"use client";

import { useEffect, useState } from "react";
import styles from "./CyberLoader.module.css";

export default function CyberLoader() {
  const [stage, setStage] = useState<"LOADING" | "EXITING" | "HIDDEN">("LOADING");
  const [text, setText] = useState("Chargement");

  useEffect(() => {
    // 1. Changement de texte stylé
    const t1 = setTimeout(() => setText("Préparation"), 500);
    
    // 2. Début de la fin (Exit Animation)
    const exitTimer = setTimeout(() => {
      setText("Prêt");
      setStage("EXITING");
    }, 1100);

    // 3. Suppression totale du DOM après l'anim
    const removeTimer = setTimeout(() => {
      setStage("HIDDEN");
    }, 1600);

    return () => {
      clearTimeout(t1);
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