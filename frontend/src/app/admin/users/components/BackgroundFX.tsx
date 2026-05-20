import { motion } from "framer-motion";
// 🔥 L-FIX HNA: U majuscule 🔥
import styles from "../Nexus.module.css";

export default function BackgroundFX() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className={styles.quantumGrid}></div>

      <motion.div 
        className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-cyan-500/15 rounded-full blur-[120px]"
        animate={{ x: [0, 100, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div 
        className="absolute bottom-[-10%] right-[-10%] w-[35vw] h-[35vw] bg-purple-600/15 rounded-full blur-[120px]"
        animate={{ x: [0, -80, 0], y: [0, -40, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      <motion.div 
        className="absolute top-[40%] left-[60%] w-[20vw] h-[20vw] bg-blue-500/10 rounded-full blur-[90px]"
        animate={{ x: [0, -50, 0], y: [0, 80, 0], scale: [1, 1.5, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
    </div>
  );
}