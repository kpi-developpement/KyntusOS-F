"use client";

import { useEffect, useState } from "react";
import styles from "./CyberLoader.module.css";

/**
 * Loader d'ouverture Kyntus — une seule fois par session de navigateur.
 *  1. Le cercle et le monogramme K se dessinent (SVG stroke-dashoffset)
 *  2. Le remplissage en dégradé apparaît, le compteur monte jusqu'à 100
 *  3. Le voile se rétracte en cercle sur le logo et dévoile l'application
 */
const KEY = "kx-loader-seen";

export default function CyberLoader() {
  const [stage, setStage] = useState<"idle" | "draw" | "exit" | "done">("idle");
  const [count, setCount] = useState(0);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(KEY) === "1"; } catch { /* stockage indisponible */ }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- décision unique au montage
    if (seen || reduce) { setStage("done"); return; }
    setStage("draw");
    const start = performance.now();
    const total = 1700;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / total);
      const e = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(e * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const t1 = setTimeout(() => setStage("exit"), total + 250);
    const t2 = setTimeout(() => {
      try { sessionStorage.setItem(KEY, "1"); } catch { /* stockage indisponible */ }
      setStage("done");
    }, total + 1150);
    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (stage === "done" || stage === "idle") return null;

  return (
    <div className={`${styles.overlay} ${stage === "exit" ? styles.exit : ""}`} role="status" aria-label="Chargement de Kyntus OS">
      <div className={styles.aura} />
      <div className={styles.center}>
        <svg className={styles.logo} viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <linearGradient id="kx-lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#60a5fa" />
              <stop offset="0.5" stopColor="#2563eb" />
              <stop offset="1" stopColor="#1e40af" />
            </linearGradient>
          </defs>
          <circle className={styles.ringTrack} cx="60" cy="60" r="54" />
          <circle className={styles.ring} cx="60" cy="60" r="54" style={{ strokeDashoffset: 340 - (340 * count) / 100 }} />
          <rect className={styles.tile} x="26" y="26" width="68" height="68" rx="20" />
          <path className={styles.k} d="M47 40 V80 M73 40 L50 61 L74 80" />
        </svg>
        <div className={styles.word} aria-hidden="true">
          {"Kyntus".split("").map((c, i) => <span key={i} style={{ animationDelay: `${0.5 + i * 0.05}s` }}>{c}</span>)}
          <b style={{ animationDelay: "0.85s" }}>OS</b>
        </div>
        <div className={styles.meter}>
          <span className={styles.count} style={{ fontWeight: 300 + count * 4 }}>{String(count).padStart(3, "0")}</span>
          <span className={styles.bar}><i style={{ transform: `scaleX(${count / 100})` }} /></span>
        </div>
      </div>
    </div>
  );
}
