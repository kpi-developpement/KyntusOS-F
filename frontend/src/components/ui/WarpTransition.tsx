"use client";
import React from "react";
import styles from "./WarpTransition.module.css";

interface WarpTransitionProps {
  active: boolean;
}

export default function WarpTransition({ active }: WarpTransitionProps) {
  return (
    <div className={`${styles.container} ${active ? styles.active : ''}`}>
      {/* Layer 1 dyal njoum */}
      <div className={styles.stars}></div>
      {/* Flash flkher */}
      <div className={styles.flash}></div>
    </div>
  );
}