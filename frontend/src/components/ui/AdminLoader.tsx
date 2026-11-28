"use client";

import styles from "./AdminLoader.module.css";

/** Attente courte pendant la vérification de session : discrète, sans texte inventé. */
export default function AdminLoader() {
  return (
    <div className={styles.overlay} role="status" aria-label="Vérification de la session">
      <span className={styles.mark}>K</span>
      <span className={styles.dots}><i /><i /><i /></span>
    </div>
  );
}
