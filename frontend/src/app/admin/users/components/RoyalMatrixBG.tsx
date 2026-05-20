import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import styles from "../RoyalMatrixBG.module.css";

export default function RoyalMatrixBG() {
  // Motion values l-les coordonnes dyal l-souris
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Configuration dyal "Spring" bach l-interactivité t-koun smooth (mashi m9et3a)
  const springConfig = { damping: 30, stiffness: 150, mass: 0.8 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Kan-n9so 300 hit l-width w l-height dyal l-glow houma 600px (bach y-ji l-centre dyalo f-souris)
      mouseX.set(e.clientX - 300);
      mouseY.set(e.clientY - 300);
    };

    window.addEventListener("mousemove", handleMouseMove);
    
    // Nettoyage dyal l-event mlli kay-tssed l-composant
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className={styles.bgContainer}>
      {/* 1. Dust Particles */}
      <div className={styles.floatingDust}></div>

      {/* 2. Grid Interactive */}
      <div className={styles.gridLayer}></div>

      {/* 3. Ambient Lights */}
      <div className={styles.ambientOrb1}></div>
      <div className={styles.ambientOrb2}></div>

      {/* 4. THE INTERACTIVE GLOW 🔥 */}
      <motion.div
        className={styles.mouseGlow}
        style={{
          x: smoothX,
          y: smoothY,
        }}
      />
    </div>
  );
}