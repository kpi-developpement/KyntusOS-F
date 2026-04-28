"use client";
import styles from "./RoyalBackground.module.css";

export default function RoyalBackground() {
  return (
    <div className={styles.container}>
      {/* 20% White Glow */}
      <div className={styles.whiteGlow}></div>
      {/* 10% Green Grid (Foq l-70% Blue) */}
      <div className={styles.grid3d}></div>
    </div>
  );
}