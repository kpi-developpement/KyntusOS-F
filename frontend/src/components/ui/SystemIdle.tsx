import React from "react";
import styles from "./SystemIdle.module.css";

export default function SystemIdle() {
  return (
    <div className={styles.wrapper}>
      
      {/* 3D REACTOR */}
      <div className={styles.reactorContainer}>
        <div className={styles.core}></div>
        <div className={`${styles.ring} ${styles.ring1}`}></div>
        <div className={`${styles.ring} ${styles.ring2}`}></div>
        <div className={`${styles.ring} ${styles.ring3}`}></div>
        <div className={styles.particles}></div>
      </div>

      {/* TEXTE CYBERPUNK */}
      <div className={styles.textContainer}>
        <h1 className={styles.title}>SYSTEM IDLE</h1>
        <div className={styles.subtitle}>
          &gt; WAITING FOR MISSION INJECTION..._
        </div>
      </div>

      {/* SOL QUI BOUGE */}
      <div className={styles.floor}></div>
    </div>
  );
}